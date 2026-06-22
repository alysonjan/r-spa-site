import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("holiday_packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ packages: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[api/admin/holiday-packages] GET Error:", error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Auto-generate a code if not provided (lowercase, underscores)
    const code = body.code || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const { data, error } = await supabaseAdmin
      .from("holiday_packages")
      .insert({
        code,
        name: body.name,
        price_cents: body.priceCents,
        short_desc: body.shortDesc,
        inclusions: body.inclusions || [],
        highlight: body.highlight || null,
        fine_print: body.finePrint || [],
        available: body.available !== undefined ? body.available : true,
        active_to: body.activeTo || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, package: data }, { status: 201 });
  } catch (error: any) {
    console.error("[api/admin/holiday-packages] POST Error:", error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}
