import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.priceCents !== undefined) updateData.price_cents = body.priceCents;
    if (body.shortDesc !== undefined) updateData.short_desc = body.shortDesc;
    if (body.inclusions !== undefined) updateData.inclusions = body.inclusions;
    if (body.highlight !== undefined) updateData.highlight = body.highlight;
    if (body.finePrint !== undefined) updateData.fine_print = body.finePrint;
    if (body.available !== undefined) updateData.available = body.available;
    if (body.activeTo !== undefined) updateData.active_to = body.activeTo;
    if (body.code !== undefined) updateData.code = body.code;

    const { data, error } = await supabaseAdmin
      .from("holiday_packages")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, package: data }, { status: 200 });
  } catch (error: any) {
    console.error(`[api/admin/holiday-packages/${params.id}] PUT Error:`, error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabaseAdmin
      .from("holiday_packages")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`[api/admin/holiday-packages/${params.id}] DELETE Error:`, error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}
