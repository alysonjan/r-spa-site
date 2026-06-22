import { supabaseAdmin } from "./lib/supabase/admin";

async function cleanDummy() {
  const { error } = await supabaseAdmin.from("package_purchases").delete().eq("buyer_user_id", "00000000-0000-0000-0000-000000000000");
  console.log("Delete result:", error);
}

cleanDummy();
