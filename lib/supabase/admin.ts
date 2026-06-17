// /lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client with service role key
 * ⚠️ USE WITH CAUTION: This bypasses Row Level Security (RLS)
 * 
 * Use cases:
 * - API routes that need to perform admin operations
 * - Batch operations that need to bypass RLS
 * - Server-side operations where user context is not needed
 * 
 * DO NOT use this in:
 * - Client components (will expose service role key)
 * - Operations where you need user authentication context
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Helper function to check if we're using admin client
 */
export function isAdminClient() {
  return true;
}
