import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { data: events, error } = await supabaseAdmin
      .from('newsletter_events')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Failed to fetch newsletter events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, date_info, location, description, highlights, image_url, link_url, link_text, is_archived, display_order } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (date_info !== undefined) updatePayload.date_info = date_info;
    if (location !== undefined) updatePayload.location = location;
    if (description !== undefined) updatePayload.description = description;
    if (highlights !== undefined) updatePayload.highlights = highlights;
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (link_url !== undefined) updatePayload.link_url = link_url;
    if (link_text !== undefined) updatePayload.link_text = link_text;
    if (is_archived !== undefined) updatePayload.is_archived = is_archived;
    if (display_order !== undefined) updatePayload.display_order = display_order;

    const { data, error } = await supabaseAdmin
      .from('newsletter_events')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event: data });
  } catch (error: any) {
    console.error('Failed to update newsletter event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { data, error } = await supabaseAdmin
      .from('newsletter_events')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event: data });
  } catch (error: any) {
    console.error('Failed to create newsletter event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('newsletter_events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete newsletter event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
