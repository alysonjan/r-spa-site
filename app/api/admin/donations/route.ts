import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/admin/donations] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("[GET /api/admin/donations] Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
