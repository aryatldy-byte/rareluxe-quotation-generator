import { createClient } from '@supabase/supabase-js';

// Server-only. Uses the service-role key when provided (recommended),
// otherwise falls back to the anon key.
export function serverSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
