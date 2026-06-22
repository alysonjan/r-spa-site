import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("special_offers")
      .select("*")
      .eq("is_active", true)
      .or(`active_to.is.null,active_to.gt.${now}`)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, offers: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
