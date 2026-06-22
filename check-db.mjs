import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf-8');
const envConfig = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envConfig[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('special_offers').select('*');
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Success! Data length:", data.length);
  }
}
check();
