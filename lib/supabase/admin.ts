import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role Supabase client — BYPASSES RLS.
 *
 * Use only in trusted server contexts that have already performed their own
 * authorization checks: payment webhooks (PayFast ITN), admin actions verified via `is_admin`,
 * and the `handle_new_user` flows. Never expose this client to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
