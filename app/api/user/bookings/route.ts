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

    if (email) {
      query = query.eq("customer_email", email);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Build a service name -> price lookup from the services table
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("name, title, options")
      .eq("is_active", true);

    const servicePriceMap: Record<string, number> = {};
    for (const svc of services || []) {
      const key = svc.title || svc.name;
      if (key && svc.options && Array.isArray(svc.options) && svc.options.length > 0) {
        // Use the first option's price as the default
        const rawPrice = String(svc.options[0].price || "0").replace(/[^0-9.]/g, "");
        const cents = Math.round(parseFloat(rawPrice) * 100);
        if (cents > 0) {
          servicePriceMap[key] = cents;
        }
      }
    }

    // Map to what mobile app expects
    const mapped = (data || []).map(b => {
      // Use price_cents from booking if available, otherwise look up from services table
      let priceCents = b.price_cents || 0;
      if (!priceCents && b.service_name && servicePriceMap[b.service_name]) {
        priceCents = servicePriceMap[b.service_name];
      }

      return {
        id: b.id,
        serviceName: b.service_name,
        date: b.start_at.split('T')[0],
        time: new Date(b.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        status: b.status === 'pending' ? 'Pending' : b.status === 'confirmed' ? 'Confirmed' : b.status === 'cancelled' ? 'Cancelled' : 'Completed',
        price: priceCents > 0 ? (priceCents / 100).toFixed(2) : "0.00",
      };
    });

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
