// app/api/tabs/[id]/items/route.ts — Add and list tab items
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { data: items, error } = await supabaseAdmin
      .from("tab_items")
      .select("*")
      .eq("tab_id", tabId)
      .order("added_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return NextResponse.json(
      { items: items || [] },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tabId = params.id;
    const body = await req.json();
    const { type, name, price_cents, quantity, added_by, notes } = body;

    if (!name || !price_cents) {
      return NextResponse.json(
        { error: "name and price_cents are required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Verify tab exists and is not closed
    const { data: tab, error: tabError } = await supabaseAdmin
      .from("spa_tabs")
      .select("id, status")
      .eq("id", tabId)
      .single();

    if (tabError || !tab) {
      return NextResponse.json(
        { error: "Tab not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (tab.status === "closed") {
      return NextResponse.json(
        { error: "Cannot add items to a closed tab" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Insert the item
    const { data: item, error: insertError } = await supabaseAdmin
      .from("tab_items")
      .insert({
        tab_id: tabId,
        type: type || "service",
        name,
        price_cents,
        quantity: quantity || 1,
        added_by: added_by || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[tabs/[id]/items POST] error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Update the running total on the tab
    const { data: allItems } = await supabaseAdmin
      .from("tab_items")
      .select("price_cents, quantity")
      .eq("tab_id", tabId);

    const newTotal = (allItems || []).reduce(
      (sum: number, i: any) => sum + i.price_cents * i.quantity,
      0
    );

    await supabaseAdmin
      .from("spa_tabs")
      .update({ total_cents: newTotal })
      .eq("id", tabId);

    return NextResponse.json(
      { ok: true, item, total_cents: newTotal },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e: any) {
    console.error("[tabs/[id]/items POST] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
