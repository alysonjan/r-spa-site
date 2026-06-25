// app/bistro/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "281 Bistro",
  description:
    "Rejuvenessence Bistro, proudly features the licious, tantalizing, delicacies of the highly accredited chef Todd which engenders an additional pleasurable flavour to your  experience with us.  (minimum group of 20 people.)",
  alternates: { canonical: "/bistro" },
};

import { supabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 0; // Force dynamic

// —— UI Components —— //
function formatPrice(price: number | null, basePrice: number | null) {
  if (price === null && basePrice === null) return "";
  
  const displayPrice = price || basePrice;
  return `$${displayPrice}`;
}

function FoodGrid({ items }: { items: any[] }) {
  return (
    <ul className="grid gap-5 sm:gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <li key={it.id} className="overflow-hidden rounded-xl border bg-white flex flex-col">
          <div className="relative aspect-[4/3] bg-zinc-100 flex-shrink-0">
            {it.image_url ? (
              <Image
                src={it.image_url}
                alt={it.item_name}
                fill
                sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-zinc-300">
                 <span className="text-sm">No Image</span>
               </div>
            )}
          </div>
          <div className="p-4 flex-grow flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold leading-6 text-zinc-900">{it.item_name}</h4>
              <div className="shrink-0 text-right">
                 <span className="text-sm font-semibold text-emerald-600">${it.current_price || it.base_price || 0}</span>
                 {it.current_price > 0 && it.base_price > 0 && it.current_price < it.base_price && (
                   <div className="text-xs text-rose-500 line-through">${it.base_price}</div>
                 )}
              </div>
            </div>
            {it.description && <p className="mt-1 text-sm leading-6 text-zinc-600 flex-grow">{it.description}</p>}
            {it.seasonal_tag && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                  {it.seasonal_tag}
                </span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}



export default async function BistroPage() {
  let allItems: any[] = [];

  try {
    const { data } = await supabaseAdmin
      .from('bistro_items')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('item_name');
    if (data) allItems = data;
  } catch (err) {
    console.error("Failed to load bistro menu server-side:", err);
  }

  // Group items by category
  const categories: Record<string, any[]> = {};
  allItems.forEach(item => {
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

  return (
    <>
      <Section eyebrow="BISTRO" title="281 Bistro">
        <p className="max-w-3xl text-lg text-zinc-600 leading-relaxed md:leading-8">
          Rejuvenessence Bistro, proudly features the licious, tantalizing, delicacies
          of the highly accredited chef Todd which engenders an additional pleasurable
          flavour to your experience with us. (Minimum group of 20 people.)
        </p>
        <div className="mt-5 flex gap-3">
          <Link href="/booking" className="btn btn-primary">Reserve seating</Link>
          <Link href="/policies" className="btn btn-ghost">Policies</Link>
        </div>
      </Section>

      {allItems.length === 0 ? (
         <Section title="Menu Updating">
           <p className="text-zinc-500">Our menu is currently being updated. Please check back later!</p>
         </Section>
      ) : (
        <>
          {foodCats.map((cat, idx) => (
            <Section key={cat} eyebrow={idx === 0 ? "MENU" : undefined} title={cat}>
              <FoodGrid items={categories[cat]} />
            </Section>
          ))}

          {hasBarItems && (
            <Section eyebrow="BAR" title="Cocktails • Wine • Beer & Zero-Proof">
              <div className="grid gap-6 md:grid-cols-3">
                {barCategories.map(cat => {
                  const items = categories[cat];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h4 className="mb-2 font-semibold">{cat}</h4>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {items.map(it => (
                          <li key={it.id} className="rounded-xl border bg-white p-4">
                            <div className="font-semibold leading-6 flex justify-between gap-2">
                              <span>{it.item_name}</span>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-semibold text-emerald-600">${it.current_price || it.base_price || 0}</span>
                                {it.current_price > 0 && it.base_price > 0 && it.current_price < it.base_price && (
                                  <span className="ml-2 text-xs text-rose-500 line-through">${it.base_price}</span>
                                )}
                              </div>
                            </div>
                            {it.description && <p className="mt-1 text-sm leading-6 text-zinc-600">{it.description}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 border-t border-zinc-200 pt-8 mt-16">
        <p className="text-sm leading-6 text-zinc-500 text-center">
          Menu prepared in collaboration with{" "}
          <a
            href="https://cheftoddskitchen.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-900 transition-colors"
          >
            Chef Todd’s Kitchen
          </a>
          . Offerings/pricing may change based on season and supply.
        </p>
      </div>
    </>
  );
}