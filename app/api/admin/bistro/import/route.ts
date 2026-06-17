import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the Excel file
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Process the first sheet
    const masterSheetName = workbook.SheetNames[0];
    const masterSheet = workbook.Sheets[masterSheetName];
    
    // Convert sheet to JSON
    const rawData = xlsx.utils.sheet_to_json(masterSheet);
    
    const itemsToUpsert = [];

    for (const row of rawData as any[]) {
      // Look for Item Name, Description, Category, Base Price, Current Price
      if (!row['Item Name']) continue;

      const isActive = row['Active (Y/N)'] ? (row['Active (Y/N)'] === 'Y' || row['Active (Y/N)'] === 'Yes') : true;
      
      const item = {
        item_name: row['Item Name'],
        description: row['Description'] || '',
        category: row['Category'] || 'Other',
        base_price: parseFloat(row['Base Price']) || null,
        current_price: parseFloat(row['Current Price']) || 0,
        discount_percent: parseFloat(row['Discount %']) || 0,
        seasonal_tag: row['Seasonal Tag'] || null,
        is_active: isActive,
      };
      
      // Let's find existing by name to update, else create new
      const { data: existing } = await supabaseAdmin
        .from('bistro_items')
        .select('id')
        .eq('item_name', item.item_name)
        .single();
        
      if (existing) {
        itemsToUpsert.push({ id: existing.id, ...item });
      } else {
        itemsToUpsert.push(item);
      }
    }

    if (itemsToUpsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('bistro_items')
        .upsert(itemsToUpsert);
        
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: `Successfully imported ${itemsToUpsert.length} items.` });

  } catch (error: any) {
    console.error('Excel Import Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import Excel' }, { status: 500 });
  }
}
