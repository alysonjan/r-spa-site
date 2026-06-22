require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('special_offers').select('*');
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  console.log("Data:", data);
}

check();
