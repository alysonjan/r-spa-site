import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, service_name, customer_name, start_at, price_cents, deposit_cents, status, offer_code, package_code, addons",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("[api/bookings/brief] not found:", error);
    return NextResponse.json({ error: "not found" }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  return NextResponse.json({
    ...data,
    start_ts_fmt: data.start_at
      ? dayjs.utc(data.start_at).local().format("MMM D, YYYY h:mm A")
      : "",
  }, { headers: { 'Access-Control-Allow-Origin': '*' } });
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
