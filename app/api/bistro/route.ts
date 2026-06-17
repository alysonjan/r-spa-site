import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Get published menus
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('bistro_menus')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (menusError) throw menusError;

    if (!menus || menus.length === 0) {
      return NextResponse.json({ menus: [], items: [] }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        }
      });
    }

    // 2. Get the items for these menus
    const menuIds = menus.map(m => m.id);
    
    const { data: menuItems, error: itemsError } = await supabaseAdmin
      .from('bistro_menu_items')
      .select(`
        menu_id,
        sort_order,
        bistro_items (*)
      `)
      .in('menu_id', menuIds);

    if (itemsError) throw itemsError;

    // Filter out inactive items just in case
    const filteredItems = menuItems?.filter((mi: any) => mi.bistro_items?.is_active) || [];

    // Format the response to be easy to consume by the frontend
    // Shape: { menus: [{ id, name }], menuData: { [menu_id]: [item1, item2] } }
    const responseData = {
      menus: menus.map(m => ({ id: m.id, name: m.name })),
      itemsByMenu: {} as any
    };

    for (const menu of menus) {
      const itemsForThisMenu = filteredItems
        .filter((mi: any) => mi.menu_id === menu.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((mi: any) => mi.bistro_items);
        
      responseData.itemsByMenu[menu.id] = itemsForThisMenu;
    }

    return NextResponse.json(responseData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });

  } catch (error: any) {
    console.error('Bistro API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load bistro data' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
