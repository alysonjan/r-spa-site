import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("services")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("[admin/services] GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, category, description, image_url, options, availability, is_active } = body;

    if (!title || !category) {
      return NextResponse.json({ error: "Title and Category are required" }, { status: 400 });
    }

    const payload = {
      title,
      category,
      description: description || null,
      image_url: image_url || null,
      options: options || [],
      availability: availability || { days: [], times: [] },
      is_active: is_active ?? true,
    };

    let result;
    if (id) {
      // Update existing
      result = await supabaseAdmin
        .from("services")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Create new
      result = await supabaseAdmin
        .from("services")
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json(result.data, { status: 200 });
  } catch (e: any) {
    console.error("[admin/services] POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[admin/services] DELETE error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
