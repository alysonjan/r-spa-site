// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPaymentSuccessEmail, sendGiftCardEmail, sendGiftCardPurchaseConfirmation, sendPackagePurchaseBuyerEmail, sendPackageGiftRecipientEmail } from "@/lib/emails";
import {
  generateGiftCardCode,
  generateRedeemToken,
  calculateExpiryDate,
  calculateTokenExpiry,
  parseGiftCardMetadata,
  dollarsToCents,
} from "@/lib/gift-card-utils";
import { getPackageByCode } from "@/lib/packages.catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  if (!sig) {
    console.error("[stripe webhook] Missing signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  const rawBody = await req.text();

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      getStripeWebhookSecret()
    );
  } catch (err: any) {
    console.error("[stripe webhook] signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // =====================================================
    // Handle Booking Payment (existing logic)
    // =====================================================
    
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const metadata = session.metadata;

      // Check if this is a gift card purchase
      if (metadata?.type === "gift_card") {
        return await handleGiftCardPurchase(session);
      }

      // Check if this is a package purchase
      if (metadata?.type === "package") {
        return await handlePackagePurchase(session);
      }

      // Otherwise, handle booking payment (existing logic)
      return await handleBookingPayment(session);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[stripe webhook] Unhandled error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// =====================================================
// Gift Card Purchase Handler (Updated Version)
// =====================================================

export async function handleGiftCardPurchase(session: any) {
  console.log("[webhook] Processing gift card purchase");

  const metadata = session.metadata;
  const cards = parseGiftCardMetadata(metadata);

  if (!cards || cards.length === 0) {
    console.error("[webhook] No cards found in metadata");
    return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
  }

  // 获取 session 和 payment intent ID
  const paymentIntentId = session.payment_intent as string;
  const sessionId = session.id;
  
  // ✅ 从 metadata 获取 sender 信息
  const senderEmail = metadata.sender_email || session.customer_email;
  const senderName = metadata.sender_name || "";
  const senderPhone = metadata.sender_phone || "";

  console.log("[webhook] Payment details:", {
    sessionId,
    paymentIntentId,
    senderEmail,
    senderName,
    cardCount: cards.length,
  });

  // 存储成功创建的礼品卡信息（用于发送确认邮件）
  const createdCards: Array<{
    code: string;
    amount: number;
    isGift: boolean;
    recipientEmail: string;
  }> = [];

  // Process each gift card
  for (const card of cards) {
    try {
      // 1. Generate unique code and token
      const code = generateGiftCardCode();
      const token = generateRedeemToken();
      const expiresAt = calculateExpiryDate();
      const tokenExpiresAt = calculateTokenExpiry();
      
      // 2. Determine if this is a gift
      const isGift = Boolean(card.is_gift);
      
      // 3. Determine recipient email
      // If it's a gift, send to recipient; otherwise send to sender
      const recipientEmail = isGift && card.recipient_email 
        ? card.recipient_email 
        : senderEmail;

      // 4. Insert into database
      const { data: giftCard, error: insertError } = await supabaseAdmin
        .from("gift_cards")
        .insert({
          code,
          amount: dollarsToCents(card.amount),
          remaining_amount: dollarsToCents(card.amount),
          
          // ✅ Sender info (购买人)
          sender_name: senderName,
          sender_email: senderEmail,
          sender_phone: senderPhone,
          
          // ✅ Recipient info (收件人 - 如果是礼物)
          recipient_email: isGift ? card.recipient_email : null,
          recipient_name: isGift ? card.recipient_name : null,
          message: isGift ? card.message : null,
          is_gift: isGift,
          
          // Token and expiry
          redeem_token: token,
          token_expires_at: tokenExpiresAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          
          // Purchase info
          purchased_by_email: senderEmail,
          purchased_at: new Date().toISOString(),
          
          // Stripe IDs
          payment_intent_id: paymentIntentId || null,
          stripe_session_id: sessionId,
          session_id: sessionId,
          
          // Status
          status: "active",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[webhook] Failed to insert gift card:", insertError);
        continue;
      }

      console.log(`[webhook] Gift card created: ${code}, isGift: ${isGift}, recipientEmail: ${recipientEmail}`);

      // 6. Track for confirmation email FIRST (before email sending)
      createdCards.push({
        code,
        amount: card.amount,
        isGift,
        recipientEmail: recipientEmail, // Use the calculated recipientEmail
      });

      // 5. Send email to recipient (either sender or actual recipient)
      // Don't let email failure prevent card creation
      try {
        await sendGiftCardEmail({
          code,
          token,
          amount: card.amount,
          recipientEmail,
          recipientName: isGift ? card.recipient_name : senderName,
          senderName: isGift ? senderName : null,
          message: isGift ? card.message : null,
          isGift,
          expiresAt: expiresAt.toISOString(),
          purchasedAt: new Date().toISOString(),
        });

        console.log(`[webhook] Gift card email sent to ${recipientEmail}`);
      } catch (emailError: any) {
        console.error(`[webhook] Failed to send email for ${code}:`, emailError);
        // Continue processing - card is still created
      }

    } catch (cardError: any) {
      console.error(`[webhook] Error processing card:`, cardError);
      // Continue with next card
    }
  }

  // 7. Send purchase confirmation to sender
  console.log(`[webhook] Sending purchase confirmation. Created cards count: ${createdCards.length}`);
  console.log(`[webhook] Created cards details:`, JSON.stringify(createdCards, null, 2));

  try {
    await sendGiftCardPurchaseConfirmation({
      senderEmail,
      senderName,
      totalAmount: cards.reduce((sum, c) => sum + c.amount, 0),
      cards: createdCards,
    });

    console.log(`[webhook] Purchase confirmation sent to ${senderEmail}`);
  } catch (confirmError: any) {
    console.error(`[webhook] Failed to send purchase confirmation:`, confirmError);
    // Don't throw - cards are already created
  }

  return NextResponse.json({ ok: true });
}

// =====================================================
// Booking Payment Handler (existing logic)
// =====================================================

async function handleBookingPayment(session: any) {
  const bookingId = session.metadata?.booking_id;
  const paymentIntent = session.payment_intent as string | null;

  if (!bookingId) {
    console.warn("[stripe webhook] Missing booking_id in metadata");
    return NextResponse.json({ ok: false, reason: "no booking_id" });
  }

  console.log(`[stripe webhook] Payment success for booking ${bookingId}`);

  // Update booking status
  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "confirmed",
      payment_intent_id: paymentIntent ?? null,
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    console.error("[stripe webhook] DB update failed:", updateError);
  }

  // Read booking details
  const { data: booking, error: readError } = await supabaseAdmin
    .from("bookings")
    .select("customer_email, customer_name, service_name, start_at, deposit_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError) {
    console.error("[stripe webhook] Failed to read booking:", readError);
    return NextResponse.json({ error: "DB read failed" }, { status: 500 });
  }

  // Send confirmation email
  if (booking?.customer_email && booking?.service_name && booking?.start_at) {
    const email = booking.customer_email;
    const name = booking.customer_name || "Guest";
    const service = booking.service_name;
    const start = new Date(booking.start_at).toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "medium",
      timeStyle: "short",
    });

    try {
      await sendPaymentSuccessEmail(email, name, service, start);
      console.log(`[email] Payment confirmation sent to ${email}`);
    } catch (mailErr: any) {
      console.error("[email] Failed to send payment confirmation:", mailErr);
    }
  }

  return NextResponse.json({ ok: true });
}

// =====================================================
// Package Purchase Handler
// =====================================================

async function handlePackagePurchase(session: any) {
  console.log("[webhook] Processing package purchase");

  const metadata = session.metadata || {};
  const packageCode = metadata.package_code;
  const buyerUserId = metadata.buyer_user_id;
  const isGift = metadata.is_gift === "true";
  const recipientName = metadata.recipient_name || null;
  const recipientEmail = metadata.recipient_email || null;
  const giftMessage = metadata.gift_message || null;
  const sessionId = session.id;
  const amountTotal = session.amount_total; // in cents
  const isTestPurchase = metadata.is_test === "true";
  const metadataTestAmount = metadata.test_amount_cents
    ? Number.parseInt(metadata.test_amount_cents, 10)
    : null;

  if (!packageCode || !buyerUserId) {
    console.error("[webhook] Missing required package metadata");
    return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
  }

  // Check if purchase already exists (idempotent)
  const { data: existing } = await supabaseAdmin
    .from("package_purchases")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existing) {
    console.log("[webhook] Package purchase already processed");
    return NextResponse.json({ ok: true });
  }

  // Insert package purchase record
  const { data: purchase, error: insertError } = await supabaseAdmin
    .from("package_purchases")
    .insert({
      buyer_user_id: buyerUserId,
      package_code: packageCode,
      is_gift: isGift,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      gift_message: giftMessage,
      stripe_session_id: sessionId,
      amount_cents: amountTotal,
      currency: "cad",
      status: "paid",
      is_test: isTestPurchase,
      test_amount_cents:
        isTestPurchase && metadataTestAmount
          ? metadataTestAmount
          : isTestPurchase
          ? amountTotal
          : null,
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    console.error("[webhook] Failed to insert package purchase:", insertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  console.log("[webhook] Package purchase created:", purchase.id);

  // Get package details from catalog
  const pkg = getPackageByCode(packageCode);
  const packageName = pkg?.name || packageCode;

  // Get buyer email from Stripe session first (most reliable), fallback to Supabase profile
  let buyerEmail = session.customer_details?.email || session.customer_email;
  let buyerName = "Customer";

  if (!buyerEmail) {
    // Fallback: lookup from Supabase auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(buyerUserId);
    buyerEmail = authUser?.user?.email;
  }

  // Get buyer name from profile
  const { data: buyer } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", buyerUserId)
    .maybeSingle();

  if (buyer?.first_name && buyer?.last_name) {
    buyerName = `${buyer.first_name} ${buyer.last_name}`.trim();
  } else if (buyer?.first_name) {
    buyerName = buyer.first_name;
  }

  // Send confirmation email to buyer (non-blocking)
  if (buyerEmail) {
    try {
      await sendPackagePurchaseBuyerEmail({
        buyerEmail,
        buyerName,
        packageName,
        packageCode,
        amountCents: amountTotal,
        purchasedAt: purchase.created_at || new Date().toISOString(),
        isGift,
        recipientEmail,
      });
      console.log(`[webhook] Buyer email sent to ${buyerEmail}`);
    } catch (emailError: any) {
      console.error("[webhook] Failed to send buyer email:", emailError);
      // Don't throw - continue processing
    }
  } else {
    console.warn("[webhook] No buyer email available, skipping buyer email");
  }

  // Send gift recipient email if applicable (non-blocking)
  if (isGift && recipientEmail && recipientName) {
    try {
      await sendPackageGiftRecipientEmail({
        recipientEmail,
        recipientName,
        senderName: buyerName,
        packageName,
        packageCode,
        amountCents: amountTotal,
        giftMessage,
      });
      console.log(`[webhook] Gift recipient email sent to ${recipientEmail}`);
    } catch (emailError: any) {
      console.error("[webhook] Failed to send gift recipient email:", emailError);
      // Don't throw - continue processing
    }
  } else if (isGift && recipientEmail && !recipientName) {
    console.warn("[webhook] Gift recipient email skipped: missing recipient name");
  }

  return NextResponse.json({ ok: true });
}
