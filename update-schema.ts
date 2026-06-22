import { supabaseAdmin } from "./lib/supabase/admin";

async function addActiveToColumn() {
  console.log("Adding active_to column to special_offers...");
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    query: `ALTER TABLE public.special_offers ADD COLUMN IF NOT EXISTS active_to TIMESTAMPTZ;`
  });

  if (error) {
    console.error("Error via RPC:", error);
    // Since `exec_sql` might not exist (from my earlier test), I'll just write an SQL file for the user or use another way
  } else {
    console.log("Success.");
  }
}

addActiveToColumn();
