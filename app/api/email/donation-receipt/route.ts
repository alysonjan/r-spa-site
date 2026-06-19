import { NextResponse } from "next/server";
import { sendDonationReceipt } from "@/lib/emails";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      console.error("[email/donation-receipt] missing paymentIntentId");
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    // Retrieve payment intent to verify
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Invalid or incomplete payment" }, { status: 400 });
    }

    const metadata = paymentIntent.metadata;
    if (metadata?.type !== "donation") {
      return NextResponse.json({ error: "Not a donation payment" }, { status: 400 });
    }

    const to = metadata.donor_email || paymentIntent.receipt_email;
    if (!to) {
      return NextResponse.json({ error: "No email address found for this donation" }, { status: 400 });
    }

    const amountStr = (paymentIntent.amount / 100).toFixed(2);
    const donorName = metadata.donor_name || "Generous Donor";
    const date = new Date(paymentIntent.created * 1000).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });

    // Send email
    const { messageId } = await sendDonationReceipt(to, donorName, amountStr, paymentIntent.id, date);

    console.log(`[email/donation-receipt] Sent to ${to}, messageId: ${messageId}`);
    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error("[email/donation-receipt] failed:", err);
    return NextResponse.json({ error: err.message || "Failed to send donation receipt email" }, { status: 500 });
  }
}
