import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-10-29.clover" as any,
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
    const { amountCents, customerEmail, metadata, returnUrl, serviceName } = await req.json();

    if (!amountCents) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail || undefined,
      metadata: metadata || {},
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: serviceName || metadata?.serviceName || "Spa Booking",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: returnUrl ? `${returnUrl}?success=true` : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/success`,
      cancel_url: returnUrl ? `${returnUrl}?canceled=true` : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/cancel`,
    });

    return NextResponse.json(
      { 
        sessionId: session.id,
        url: session.url 
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error("[/api/create-checkout-session] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
