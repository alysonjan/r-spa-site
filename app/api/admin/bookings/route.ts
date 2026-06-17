// app/api/admin/bookings/route.ts
import { NextResponse, NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createBooking } from "@/lib/bookings";
import { sendBookingEmails } from "@/lib/emails";

dayjs.extend(utc);
dayjs.extend(tz);

const TZ = process.env.TIMEZONE || "America/Toronto";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseDayToUTCStart(d: string) {
  return dayjs.utc(d).startOf("day").toISOString();
}
function parseDayToUTCExclusiveNext(d: string) {
  return dayjs.utc(d).add(1, "day").startOf("day").toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const statusParam = searchParams.get("status");

    let query = supabaseAdmin
      .from("bookings")
      .select(
        "id, service_name, start_at, end_at, status, customer_name, customer_phone, customer_email, notes, offer_code, package_code, addons",
      );

    if (statusParam) {
      query = query.eq("status", statusParam);
    } else if (fromParam && toParam) {
      query = query
        .gte("start_at", parseDayToUTCStart(fromParam))
        .lt("start_at", parseDayToUTCExclusiveNext(toParam));
    }

    const { data, error } = await query.order("start_at", { ascending: true });
    if (error) throw error;

    const events = (data ?? []).map((r) => ({
      id: r.id,
      service_name: r.service_name,
      title: `${r.service_name}${r.status === "cancelled" ? " (cancelled)" : ""}`,
      start: r.start_at,
      end: r.end_at,
      status: r.status,
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
      notes: r.notes ?? "",
      offer_code: r.offer_code,
      package_code: r.package_code,
      addons: r.addons,
    }));

    return NextResponse.json(events, { status: 200 });
  } catch (e: any) {
    console.error("[admin/bookings] error:", e);
    return NextResponse.json(
      { error: e.message || "server error" },
      { status: 500 },
    );
  }
}

// Admin manual booking creation
const schema = z.object({
  service: z.string(),
  date: z.string().min(8),
  time: z.string().min(4),
  duration: z.number().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  notes: z.string().optional().default(""),
  offer_code: z.string().optional(),
  package_code: z.string().optional(),
  addons: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sendEmail = searchParams.get("sendEmail") === "true";

    const body = await req.json();
    const data = schema.parse(body);

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
    });

    if (!result.success) {
      const status = result.error === "time_taken" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Optionally send emails
    if (sendEmail) {
      sendBookingEmails({
        service: result.data!.service_name,
        startISO: result.data!.start_at,
        endISO: result.data!.end_at,
        name: result.data!.customer_name,
        email: result.data!.customer_email,
        phone: result.data!.customer_phone,
        notes: result.data!.notes || "",
      }).catch((e) => console.error("[admin/bookings POST] email error:", e));
    }

    // Return formatted event for calendar
    return NextResponse.json({
      ok: true,
      event: {
        id: result.data!.id,
        title: result.data!.service_name,
        start: result.data!.start_at,
        end: result.data!.end_at,
        status: result.data!.status,
        name: result.data!.customer_name,
        email: result.data!.customer_email,
        phone: result.data!.customer_phone,
        notes: result.data!.notes ?? "",
      },
    });
  } catch (e: any) {
    console.error("[admin/bookings POST] error:", e);
    const msg = e?.issues
      ? JSON.stringify(e.issues)
      : e?.message || "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
