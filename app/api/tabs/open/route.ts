// app/api/tabs/open/route.ts — Open a new spa tab
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      booking_id,
      customer_id,
      customer_name,
      customer_email,
      service_name,
      price_cents,
      payment_status, // 'paid' or 'unpaid'
    } = body;

    if (!customer_id || !customer_email) {
      return NextResponse.json(
        { error: "customer_id and customer_email are required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Create the tab
    const { data: tab, error: tabError } = await supabaseAdmin
      .from("spa_tabs")
      .insert({
        booking_id: booking_id || null,
        customer_id,
        customer_name: customer_name || "",
        customer_email,
        status: "open",
        payment_status: payment_status || "unpaid",
        total_cents: price_cents || 0,
        date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (tabError) {
      console.error("[tabs/open] Error creating tab:", tabError);
      return NextResponse.json(
        { error: tabError.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // If a service was booked, add it as the first tab item
    if (service_name && price_cents) {
      const { error: itemError } = await supabaseAdmin
        .from("tab_items")
        .insert({
          tab_id: tab.id,
          type: "service",
          name: service_name,
          price_cents: price_cents,
          quantity: 1,
          added_by: customer_id,
          notes: "Initial booking",
        });

      if (itemError) {
        console.error("[tabs/open] Error adding initial item:", itemError);
      }
    }

    return NextResponse.json(
      { ok: true, tab },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[tabs/open] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
