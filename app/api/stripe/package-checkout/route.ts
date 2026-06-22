// app/api/stripe/package-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getStripeClient,
  stripeMode,
  getLiveTestAmountCents,
  getLiveTestEmails,
} from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPackageByCode } from "@/lib/packages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseUser = {
  id: string;
  email?: string;
};

function normalizeSiteUrl() {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) {
    throw new Error("SITE_URL or NEXT_PUBLIC_SITE_URL must be configured");
  }
  return trimmed;
}

async function resolveUserFromHeaders(
  authHeader: string,
  cookieHeader: string,
): Promise<SupabaseUser | null> {
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  }

  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((cookie) => {
        const [key, ...vals] = cookie.trim().split("=");
        return [key, vals.join("=")];
      }),
    );

    const accessToken =
      cookies["sb-access-token"] || cookies["supabase-auth-token"];
    if (accessToken) {
      const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
      if (!error && data?.user) {
        return data.user;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";

    const user = await resolveUserFromHeaders(auth, cookieHeader);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { packageCode, isGift, recipientName, recipientEmail, message } =
      body;

    const pkg = await getPackageByCode(packageCode);
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const now = new Date();
    const isAvailable = pkg.available && (!pkg.activeTo || new Date(pkg.activeTo) > now);

    if (!isAvailable) {
      return NextResponse.json(
        { error: "Package is no longer available for purchase" },
        { status: 400 },
      );
    }


    if (isGift && (!recipientName?.trim() || !recipientEmail?.trim())) {
      return NextResponse.json(
        { error: "Recipient name and email are required for gifts" },
        { status: 400 },
      );
    }

    const buyerEmail = user.email?.toLowerCase() || null;
    const liveTestAmount = getLiveTestAmountCents();
    const eligibleEmails = getLiveTestEmails();
    const isLiveTest =
      stripeMode === "live" &&
      liveTestAmount !== null &&
      !!buyerEmail &&
      eligibleEmails.includes(buyerEmail);

    const unitAmount = isLiveTest ? liveTestAmount! : pkg.priceCents;
    const productName = isLiveTest ? `[LIVE TEST] ${pkg.name}` : pkg.name;
    const siteUrl = normalizeSiteUrl();

    const metadata: Record<string, string> = {
      type: "package",
      package_code: packageCode,
      buyer_user_id: user.id,
      buyer_email: buyerEmail || "",
      is_gift: String(Boolean(isGift)),
      recipient_name: isGift ? (recipientName || "") : "",
      recipient_email: isGift ? (recipientEmail || "") : "",
      gift_message: isGift ? (message || "") : "",
      is_test: isLiveTest ? "true" : "false",
    };

    if (isLiveTest) {
      metadata.test_amount_cents = String(unitAmount);
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: productName,
              description: pkg.shortDesc,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/packages/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/packages/checkout?package=${packageCode}`,
      metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[package-checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
