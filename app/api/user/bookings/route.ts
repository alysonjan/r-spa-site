import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("bookings")
      .select("*")
      .order("start_at", { ascending: false });

    // In a real app we'd verify the JWT, but for now we just filter by email or customer_name
    // Actually, createBooking saves customer_email
    if (email) {
      query = query.eq("customer_email", email);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map to what mobile app expects
    const mapped = (data || []).map(b => ({
      id: b.id,
      serviceName: b.service_name,
      date: b.start_at.split('T')[0],
      time: new Date(b.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }), // Approximate mapping
      status: b.status === 'pending' ? 'Pending' : b.status === 'confirmed' ? 'Confirmed' : b.status === 'cancelled' ? 'Cancelled' : 'Completed',
      price: b.price_cents ? (b.price_cents / 100).toFixed(2) : "0.00", // Fallback to 0.00 if old booking without price_cents
    }));

    return NextResponse.json(mapped, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (e: any) {
    console.error("[/api/user/bookings] error:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
