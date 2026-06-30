// app/api/book/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendBookingEmails } from "@/lib/emails";
import { createBooking } from "@/lib/bookings";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// --- very simple rate limit ---
const RL_MAX = Number(process.env.RL_MAX || 5);
const WINDOW_MS = 3 * 60 * 1000;
const hits = new Map<string, number[]>();
function ratelimit(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length <= RL_MAX;
}

// --- schema ---
const schema = z.object({
  service: z.string(),
  date: z.string().min(8), // YYYY-MM-DD 或 YYYY/MM/DD
  time: z.string().min(4), // HH:mm
  duration: z.number().optional(), // In case the client sends it
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  notes: z.string().optional().default(""),
  company: z.string().optional(), // 蜜罐
  offer_code: z.string().optional(),
  package_code: z.string().optional(),
  addons: z.array(z.string()).optional(),
  price_cents: z.number().optional(),
});

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
      "0.0.0.0";
    if (!ratelimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const body = await req.json();
    if (body?.company) return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } }); // 蜜罐

    const data = schema.parse(body);

    // Additional validation: ensure service is available in Supabase
    const { data: serviceRow, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("is_active")
      .eq("name", data.service)
      .maybeSingle();

    if (serviceError) {
      console.error("[/api/book] Error fetching service:", serviceError);
    }

    // We only block if we found the service and it's explicitly inactive
    if (serviceRow && serviceRow.is_active === false) {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Validate booking is not in the past
    // Clean up AM/PM for simple Date parsing if present, though lib/bookings.ts handles timezone properly later
    const cleanTime = data.time.replace(/\s*[AaPp][Mm]\s*/, "");
    const bookingDatetime = new Date(`${data.date}T${cleanTime}`);
    const now = new Date();
    if (bookingDatetime < now && !isNaN(bookingDatetime.getTime())) {
      return NextResponse.json(
        { error: "booking_in_past" },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Use shared booking creation logic
    const result = await createBooking({
      service: data.service,
      date: data.date,
      time: data.time,
      duration: data.duration,
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      offer_code: data.offer_code,
      package_code: data.package_code,
      addons: data.addons,
      price_cents: data.price_cents,
    });

    if (!result.success) {
      const status = result.error === "time_taken" ? 409 : 400;
      return NextResponse.json(
        { error: result.error }, 
        { status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Send booking confirmation emails (non-blocking)
    sendBookingEmails({
      service: result.data!.service_name,
      startISO: result.data!.start_at,
      endISO: result.data!.end_at,
      name: result.data!.customer_name,
      email: result.data!.customer_email,
      phone: result.data!.customer_phone,
      notes: result.data!.notes || "",
    }).catch((e) => console.error("[/api/book] email error:", e));

    return NextResponse.json(
      { ok: true, id: result.data!.id },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (e: any) {
    console.error("[/api/book] error:", e);
    const msg = e?.issues
      ? JSON.stringify(e.issues)
      : e?.message || "Unknown error";
    return NextResponse.json(
      { error: msg }, 
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
