import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("special_offers")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ offers: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[api/admin/special-offers] GET Error:", error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Auto-generate a code if not provided
    const code = body.code || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabaseAdmin
      .from("special_offers")
      .insert({
        code,
        title: body.title,
        description: body.description,
        type: body.type || 'addon',
        action_label: body.actionLabel || 'Apply',
        is_active: body.isActive !== undefined ? body.isActive : true,
        display_order: body.displayOrder || 0,
        active_to: body.activeTo || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, offer: data }, { status: 201 });
  } catch (error: any) {
    console.error("[api/admin/special-offers] POST Error:", error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}
