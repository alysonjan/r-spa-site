// lib/bookings.ts - Shared booking creation logic
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import customParse from "dayjs/plugin/customParseFormat";
import { supabaseAdmin } from "@/lib/supabase/admin";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(customParse);

const TZ = process.env.TIMEZONE || "America/Toronto";

export type CreateBookingParams = {
  service: string;
  date: string;
  time: string;
  duration?: number;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  offer_code?: string;
  package_code?: string;
  addons?: string[];
  price_cents?: number;
};

export type CreateBookingResult = {
  success: boolean;
  data?: {
    id: string;
    start_at: string;
    end_at: string;
    service_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    notes: string | null;
    status: string;
    offer_code: string | null;
    package_code: string | null;
    addons: string[] | null;
  };
  error?: string;
};

/**
 * Shared booking creation logic (used by both public /api/book and admin routes)
 */
export async function createBooking(
  params: CreateBookingParams,
): Promise<CreateBookingResult> {
  const {
    service,
    date,
    time,
    duration,
    name,
    email,
    phone,
    notes,
    offer_code,
    package_code,
    addons,
    price_cents,
  } = params;

  // Allow formats like 2025/10/22
  const dateNorm = date.replace(/[./]/g, "-");

  // Determine correct format based on presence of AM/PM
  const timeFormat = time.toUpperCase().includes("AM") || time.toUpperCase().includes("PM") 
    ? "YYYY-MM-DD hh:mm A" 
    : "YYYY-MM-DD HH:mm";

  // Parse to local timezone
  const startLocal = dayjs.tz(`${dateNorm} ${time}`, timeFormat, TZ);
  if (!startLocal.isValid()) {
    return { success: false, error: "Invalid date/time" };
  }

  const minutes = duration ?? 60;
  const endLocal = startLocal.add(minutes, "minute");

  const startISO = startLocal.utc().toISOString();
  const endISO = endLocal.utc().toISOString();

  // Conflict detection: start_at < endISO AND end_at > startISO (adjacent times are OK)
  // Only check for bookings that actually occupy the time slot (exclude cancelled)
  const { count: overlapCount, error: overlapErr } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .lt("start_at", endISO)
    .gt("end_at", startISO)
    .in("status", ["pending", "awaiting_deposit", "confirmed"]);

  if (overlapErr) {
    console.error("[createBooking] overlap check error:", overlapErr);
    return {
      success: false,
      error: `DB overlap error: ${overlapErr.message || overlapErr}`,
    };
  }

  if ((overlapCount ?? 0) > 0) {
    return { success: false, error: "time_taken" };
  }

  // Insert booking
  const row = {
    service_name: service,
    start_at: startISO,
    end_at: endISO,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    notes: notes || null,
    status: "pending" as const,
    offer_code: offer_code || null,
    package_code: package_code || null,
    addons: addons || null,
    price_cents: price_cents || 0,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert([row])
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[createBooking] insert error:", insertError);
    return {
      success: false,
      error: `DB insert error: ${insertError?.message || "Unknown error"}`,
    };
  }

  return { success: true, data: inserted };
}
