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

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.actionLabel !== undefined) updateData.action_label = body.actionLabel;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.displayOrder !== undefined) updateData.display_order = body.displayOrder;
    if (body.activeTo !== undefined) updateData.active_to = body.activeTo;
    if (body.code !== undefined) updateData.code = body.code;

    const { data, error } = await supabaseAdmin
      .from("special_offers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, offer: data }, { status: 200 });
  } catch (error: any) {
    console.error(`[api/admin/special-offers/${params.id}] PUT Error:`, error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabaseAdmin
      .from("special_offers")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`[api/admin/special-offers/${params.id}] DELETE Error:`, error);
    return NextResponse.json({ error: error.message || "server_error" }, { status: 500 });
  }
}
