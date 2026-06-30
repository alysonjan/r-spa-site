import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('bistro_items')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('item_name');

    if (error) throw error;

    if (!items || items.length === 0) {
      return NextResponse.json({ menus: [], itemsByMenu: {} }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        }
      });
    }

    // Group items by category just like the web app
    const categories: Record<string, any[]> = {};
    items.forEach(item => {
      const cat = item.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    });

    // Define food categories and bar categories
    const foodCategoryOrder = ["Small Plates", "Salads", "Pasta", "Mains", "Desserts"];
    const barCategories = ["Cocktails", "Wine", "Beer & Zero-Proof"];

    // Any category not in barCategories is treated as a food category
    const foodCats = Object.keys(categories)
      .filter(c => !barCategories.includes(c))
      .sort((a, b) => {
        const idxA = foodCategoryOrder.indexOf(a);
        const idxB = foodCategoryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    const hasBarItems = barCategories.some(c => categories[c]?.length > 0);

    // We will create two logical "menus" for the mobile app to tab between:
    // 1. "Food Menu"
    // 2. "Bar Menu" (if there are bar items)
    const menus = [{ id: 'food', name: 'Food Menu' }];
    if (hasBarItems) {
      menus.push({ id: 'bar', name: 'Bar Menu' });
    }

    const itemsByMenu: Record<string, any[]> = {
      'food': foodCats.flatMap(cat => categories[cat]),
    };

    if (hasBarItems) {
      itemsByMenu['bar'] = barCategories.flatMap(cat => categories[cat] || []);
    }

    return NextResponse.json({ menus, itemsByMenu }, {
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
