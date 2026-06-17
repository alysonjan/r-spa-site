import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
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
    const { amountCents, customerEmail, metadata } = await req.json();

    if (!amountCents) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      receipt_email: customerEmail,
      metadata: metadata || {},
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
