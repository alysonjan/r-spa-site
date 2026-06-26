// app/api/availability/route.ts
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { supabaseAdmin } from "@/lib/supabase/admin";

dayjs.extend(utc);
dayjs.extend(timezone);

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TZ = "America/Toronto";
const canceledStatuses = new Set(["canceled", "cancelled", "refunded"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  // Toronto day boundaries -> UTC ISO strings
  const dayStartUtc = dayjs.tz(date, TZ).startOf("day").utc().toISOString();
  const dayEndUtc = dayjs.tz(date, TZ).endOf("day").utc().toISOString();

  // Overlap query: start_at < dayEnd && end_at > dayStart
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("start_at, end_at, status")
    .lt("start_at", dayEndUtc)
    .gt("end_at", dayStartUtc);

  if (error) {
    return NextResponse.json({ error: "availability_query_failed" }, { status: 500 });
  }

  const bookings = (data || []).filter((b) => {
    const st = (b.status ?? "").toLowerCase();
    return !canceledStatuses.has(st);
  });

  const busyIntervals = bookings.map((b) => ({
    start_at: b.start_at,
    end_at: b.end_at,
  }));

  // legacy busy[]: HH:MM of start times in Toronto
  const busy = bookings.map((b) => {
    const d = new Date(b.start_at);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  });

  return NextResponse.json(
    { busyIntervals, busy },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    }
  );
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