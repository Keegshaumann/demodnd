import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Server Supabase client — bound to the request cookies, uses the anon key and
 * is subject to RLS (authenticated as the signed-in user). Use this for all
 * server components, route handlers, and server actions on behalf of a user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` was called from a Server Component. This can be ignored
            // when middleware refreshes the session, which it does.
          }
        },
      },
    },
  );
}
