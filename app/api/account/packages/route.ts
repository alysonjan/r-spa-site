// app/api/account/packages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);

    // Get user from access token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Query package_purchases for this user
    const { data: purchases, error: queryError } = await supabaseAdmin
      .from("package_purchases")
      .select("id, package_code, is_gift, recipient_name, recipient_email, amount_cents, currency, status, created_at, redeemed_at, is_test")
      .eq("buyer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("[api/account/packages] Query error:", queryError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ packages: purchases || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[api/account/packages] Error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
