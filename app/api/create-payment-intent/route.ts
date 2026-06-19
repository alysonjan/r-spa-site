import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createGiftCardMetadata } from "@/lib/gift-card-utils";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-10-29.clover",
});

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const { amountCents, customerEmail, metadata, cards, sender_name, sender_phone } = await req.json();

    if (!amountCents) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    let finalMetadata = { ...metadata };

    if (cards && Array.isArray(cards)) {
      const sanitizedCards = cards.map((card: any) => ({
        amount: Math.round(card.amount || 0),
        is_gift: Boolean(card.isGift),
        recipient_email: card.isGift && card.recipientEmail ? card.recipientEmail.toLowerCase().trim() : "",
        recipient_name: card.isGift && card.recipientName ? card.recipientName.trim() : "",
        message: card.isGift && card.personalMessage ? card.personalMessage.substring(0, 200).trim() : "",
      }));

      finalMetadata = {
        ...finalMetadata,
        sender_name: sender_name || metadata?.purchaserName || customerEmail || "",
        sender_email: customerEmail || "",
        sender_phone: sender_phone || metadata?.purchaserPhone || "",
        card_count: sanitizedCards.length.toString(),
        ...createGiftCardMetadata(sanitizedCards)
      };
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      receipt_email: customerEmail,
      metadata: finalMetadata,
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error("[/api/create-payment-intent] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
