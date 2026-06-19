// app/api/donate-checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover" as any,
});

export async function POST(request: Request) {
  try {
    const { amountCents, customerEmail, metadata } = await request.json();

    if (!amountCents || amountCents < 50) {
      return NextResponse.json(
        { error: "Minimum donation is $0.50" },
        { status: 400 }
      );
    }

    // Use the request's origin so the redirect works from both localhost and LAN IP
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : (request.headers.get("x-forwarded-proto") || "http");
    const siteUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail?.trim() || undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Rejuvenessence Donation",
              description: "A generous gift to Rejuvenessence Spa",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "donation",
        ...(metadata || {}),
      },
      success_url: `${siteUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/donate/cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[donate-checkout] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
