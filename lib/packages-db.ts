import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PackageCatalogItem = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  shortDesc: string;
  inclusions: string[];
  highlight?: string;
  finePrint: string[];
  available: boolean;
  activeTo?: string;
};

// Map DB row to TypeScript object
function mapPackage(row: any): PackageCatalogItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    priceCents: row.price_cents,
    shortDesc: row.short_desc,
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    highlight: row.highlight || undefined,
    finePrint: Array.isArray(row.fine_print) ? row.fine_print : [],
    available: row.available,
    activeTo: row.active_to || undefined,
  };
}

// Fetch all packages (for admin)
export async function getAllPackages(): Promise<PackageCatalogItem[]> {
  const { data, error } = await supabaseAdmin
    .from("holiday_packages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapPackage);
}

// Fetch only active/available packages (for public catalog)
export async function getActivePackages(): Promise<PackageCatalogItem[]> {
  // We filter available=true and either no activeTo date OR activeTo is in the future
  const now = new Date().toISOString();
  
  const { data, error } = await supabaseAdmin
    .from("holiday_packages")
    .select("*")
    .eq("available", true)
    .or(`active_to.is.null,active_to.gt.${now}`)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapPackage);
}

// Helper function to get package by code (using Admin client for trusted backend tasks)
export async function getPackageByCode(code: string): Promise<PackageCatalogItem | undefined> {
  const { data, error } = await supabaseAdmin
    .from("holiday_packages")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) return undefined;
  return mapPackage(data);
}

// Format price from cents to dollars
export function formatPackagePrice(cents: number): string {
  return `CA$${(cents / 100).toFixed(0)}`;
}
