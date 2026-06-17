import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('bistro_items')
      .select('*')
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Failed to fetch bistro items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, item_name, description, category, current_price, base_price, is_active, image_url } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (item_name !== undefined) updatePayload.item_name = item_name;
    if (description !== undefined) updatePayload.description = description;
    if (category !== undefined) updatePayload.category = category;
    if (current_price !== undefined) updatePayload.current_price = current_price;
    if (base_price !== undefined) updatePayload.base_price = base_price;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    const { data, error } = await supabaseAdmin
      .from('bistro_items')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    console.error('Failed to update bistro item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { data, error } = await supabaseAdmin
      .from('bistro_items')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    console.error('Failed to create bistro item:', error);
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
      .from('bistro_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete bistro item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
