import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env.public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser Supabase client — uses the anon key and is subject to RLS.
 * Safe to import in client components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
