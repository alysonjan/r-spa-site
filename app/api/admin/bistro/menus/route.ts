import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('bistro_menus')
      .select('*')
      .order('created_at', { ascending: false });

    if (menusError) throw menusError;

    // Get mappings
    const { data: mappings, error: mappingsError } = await supabaseAdmin
      .from('bistro_menu_items')
      .select('menu_id, item_id, sort_order');

    if (mappingsError) throw mappingsError;

    // Attach items to menus
    const menusWithItems = menus.map(menu => {
      const menuItems = mappings
        .filter(m => m.menu_id === menu.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(m => m.item_id);
      return { ...menu, items: menuItems };
    });

    return NextResponse.json({ menus: menusWithItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, itemIds } = await req.json();

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { data: menu, error: menuError } = await supabaseAdmin
      .from('bistro_menus')
      .insert([{ name, is_published: true }])
      .select()
      .single();

    if (menuError) throw menuError;

    if (itemIds && itemIds.length > 0) {
      const mappings = itemIds.map((id: string, idx: number) => ({
        menu_id: menu.id,
        item_id: id,
        sort_order: idx
      }));
      await supabaseAdmin.from('bistro_menu_items').insert(mappings);
    }

    return NextResponse.json({ menu: { ...menu, items: itemIds || [] } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, itemIds } = await req.json();

    if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });

    const { data: menu, error: menuError } = await supabaseAdmin
      .from('bistro_menus')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (menuError) throw menuError;

    // Update mappings: simplest way is to delete all and re-insert
    await supabaseAdmin.from('bistro_menu_items').delete().eq('menu_id', id);

    if (itemIds && itemIds.length > 0) {
      const mappings = itemIds.map((itemId: string, idx: number) => ({
        menu_id: id,
        item_id: itemId,
        sort_order: idx
      }));
      await supabaseAdmin.from('bistro_menu_items').insert(mappings);
    }

    return NextResponse.json({ menu: { ...menu, items: itemIds || [] } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabaseAdmin.from('bistro_menus').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
