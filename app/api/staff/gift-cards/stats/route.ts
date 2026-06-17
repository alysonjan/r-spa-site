import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Query all gift cards
    const { data: giftCards, error } = await supabaseAdmin
      .from("gift_cards")
      .select("status, amount, remaining_amount");

    if (error) {
      console.error("[staff/gift-cards/stats] Error:", error);
      throw error;
    }

    const stats = {
      active_count: 0,
      partially_used_count: 0,
      used_count: 0,
      cancelled_count: 0,
      expired_count: 0,
      total_active_value: 0,
      total_remaining_value: 0,
      total_used_value: 0,
    };

    if (giftCards) {
      for (const card of giftCards) {
        // Counts by status
        if (card.status === "active") stats.active_count++;
        else if (card.status === "partially_used") stats.partially_used_count++;
        else if (card.status === "used") stats.used_count++;
        else if (card.status === "cancelled") stats.cancelled_count++;
        else if (card.status === "expired") stats.expired_count++;

        // Value aggregation
        if (card.status === "active" || card.status === "partially_used") {
          stats.total_active_value += card.amount;
          stats.total_remaining_value += card.remaining_amount;
          stats.total_used_value += (card.amount - card.remaining_amount);
        } else if (card.status === "used") {
          stats.total_used_value += card.amount;
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[staff/gift-cards/stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}