// app/api/tabs/today/route.ts — Get all tabs for today (admin dashboard)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all tabs for today
    const { data: tabs, error } = await supabaseAdmin
      .from("spa_tabs")
      .select("*")
      .eq("date", today)
      .order("opened_at", { ascending: false });

    if (error) {
      console.error("[tabs/today] error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // For each tab, fetch item count and recalculate totals
    const enrichedTabs = await Promise.all(
      (tabs || []).map(async (tab: any) => {
        const { data: items, error: itemsError } = await supabaseAdmin
          .from("tab_items")
          .select("price_cents, quantity, type, name")
          .eq("tab_id", tab.id);

        const itemCount = (items || []).length;
        const liveTotal = (items || []).reduce(
          (sum: number, item: any) => sum + item.price_cents * item.quantity,
          0
        );

        return {
          ...tab,
          total_cents: liveTotal,
          item_count: itemCount,
          items: items || [],
        };
      })
    );

    return NextResponse.json(
      { tabs: enrichedTabs, date: today },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[tabs/today] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
