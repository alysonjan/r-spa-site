import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { handleGiftCardPurchase } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Call the same handler the webhook would have called
    const result = await handleGiftCardPurchase(session);

    return result;
  } catch (err: any) {
    console.error("[dev-webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
