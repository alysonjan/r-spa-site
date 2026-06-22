import { supabaseAdmin } from "./lib/supabase/admin";

async function addStripeSessionIdColumn() {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    query: `ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;`
  });

  if (error) {
    console.error("Error executing SQL via RPC:", error);
    // Let's try raw postgres connection string? No, supabaseAdmin doesn't have raw query execution by default unless rpc is defined.
    // I can just try to insert a dummy record and see if it fails because of `stripe_session_id`
    console.log("Trying to insert dummy record...");
    const { error: insertError } = await supabaseAdmin.from("package_purchases").insert({
      buyer_user_id: "00000000-0000-0000-0000-000000000000",
      package_code: "winter_glow",
      stripe_session_id: "test",
      amount_cents: 100,
      currency: "cad",
    });
    console.log("Insert result:", insertError);
  } else {
    console.log("Success executing SQL.");
  }
}

addStripeSessionIdColumn();
