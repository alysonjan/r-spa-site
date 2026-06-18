// app/api/admin/packages/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Check admin authentication (cookie admin_auth=1)
  const gate = requireAdmin(req);
  if (gate.ok === false ) return gate.res;

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const codeRaw = String(body?.code || "").trim();

  if (!codeRaw) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const code = codeRaw.toLowerCase();

  // Build query based on code length
  let query;

  if (code.length >= 32) {
    // Full UUID or close to it: exact match on id
    query = supabaseAdmin
      .from("package_purchases")
      .select("*")
      .eq("id", code)
      .limit(2);
  } else {
    // Short code (8 chars): match on redeem_code
    query = supabaseAdmin
      .from("package_purchases")
      .select("*")
      .eq("redeem_code", code)
      .limit(2);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/packages/lookup] Query error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const rows = data || [];

  // Handle matching results
  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (rows.length === 2) {
    // Ambiguous: multiple matches found
    return NextResponse.json(
      { error: "ambiguous_code", count: rows.length },
      { status: 409 }
    );
  }

  // Single match found
  return NextResponse.json({ purchase: rows[0] }, { status: 200 });
}
