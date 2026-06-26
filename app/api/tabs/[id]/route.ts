// app/api/tabs/[id]/route.ts — GET tab details, PATCH tab status
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tabId = params.id;

    // Fetch the tab
    const { data: tab, error: tabError } = await supabaseAdmin
      .from("spa_tabs")
      .select("*")
      .eq("id", tabId)
      .single();

    if (tabError || !tab) {
      return NextResponse.json(
        { error: "Tab not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Fetch all items for this tab
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("tab_items")
      .select("*")
      .eq("tab_id", tabId)
      .order("added_at", { ascending: true });

    if (itemsError) {
      console.error("[tabs/[id]] Error fetching items:", itemsError);
    }

    // Also fetch the associated booking details if available
    let booking = null;
    if (tab.booking_id) {
      const { data: bookingData } = await supabaseAdmin
        .from("bookings")
        .select("id, service_name, start_at, end_at, status, deposit_paid, customer_name, customer_email")
        .eq("id", tab.booking_id)
        .single();
      booking = bookingData;
    }

    // Calculate live total from items
    const liveTotal = (items || []).reduce(
      (sum: number, item: any) => sum + item.price_cents * item.quantity,
      0
    );

    return NextResponse.json(
      {
        tab: { ...tab, total_cents: liveTotal },
        items: items || [],
        booking,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[tabs/[id]] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tabId = params.id;
    const body = await req.json();

    const allowedFields = ["status", "payment_status", "closed_at", "total_cents"];
    const updateData: Record<string, any> = {};

    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    }

    // If closing the tab, calculate the final total from items
    if (updateData.status === "closed") {
      updateData.closed_at = new Date().toISOString();

      const { data: items } = await supabaseAdmin
        .from("tab_items")
        .select("price_cents, quantity")
        .eq("tab_id", tabId);

      const total = (items || []).reduce(
        (sum: number, item: any) => sum + item.price_cents * item.quantity,
        0
      );
      updateData.total_cents = total;
    }

    const { data: tab, error } = await supabaseAdmin
      .from("spa_tabs")
      .update(updateData)
      .eq("id", tabId)
      .select()
      .single();

    if (error) {
      console.error("[tabs/[id] PATCH] error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return NextResponse.json(
      { ok: true, tab },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[tabs/[id] PATCH] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
