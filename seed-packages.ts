import { supabaseAdmin } from "./lib/supabase/admin";

async function seed() {
  console.log("Seeding holiday packages...");
  const PACKAGES = [
    {
      code: 'winter_glow',
      name: 'Winter Glow',
      price_cents: 10000,
      short_desc: 'Complete relaxation experience',
      inclusions: ["Any 60- or 90-minute massage", "FREE 30 min Hot Tub OR Sauna (CA$45 value included)"],
      highlight: 'Perfect for deep relaxation and rejuvenation',
      fine_print: ["* Alcoholic beverages are available upon request, but are not included in the packages."],
      available: true,
      active_to: '2027-01-15 23:59:59'
    },
    {
      code: 'couples_retreat',
      name: "Couples' Holiday Retreat",
      price_cents: 10000,
      short_desc: 'Share the wellness together',
      inclusions: ["Private Hot Tub Session for Two", "Festive Seasonal Treats", "Non-Alcoholic Sparkling Beverages"],
      highlight: 'Create memorable moments with someone special',
      fine_print: ["Hot Tub maximum: 45 minutes.", "* Alcoholic beverages are available upon request, but are not included in the packages."],
      available: true,
      active_to: '2027-01-15 23:59:59'
    }
  ];

  const { data, error } = await supabaseAdmin
    .from('holiday_packages')
    .upsert(PACKAGES, { onConflict: 'code' })
    .select();

  if (error) {
    console.error("Error seeding packages:", error);
  } else {
    console.log("Successfully seeded packages:", data);
  }
}

seed();
