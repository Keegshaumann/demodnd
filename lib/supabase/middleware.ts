import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database, UserRole } from "@/lib/supabase/database.types";
import { ROLE_HOME, matchProtected, roleCanAccess } from "@/lib/auth/roles";

/**
 * Refreshes the Supabase session cookies on every request and enforces
 * role-based access to /seller, /buyer and /admin. Runs in the edge runtime, so
 * it reads the two public env vars directly rather than importing lib/env.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() validates the token with the auth server and refreshes
  // cookies. Do not trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const rule = matchProtected(pathname);

  if (rule) {
    if (!user) {
      const signinUrl = new URL("/signin", request.url);
      signinUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signinUrl);
    }

    // Authoritative role check against the users table (RLS: self-read allowed).
    const { data: profile } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role as UserRole | undefined) ?? "buyer";

    if (profile?.status === "banned" || profile?.status === "suspended") {
      const url = new URL("/signin", request.url);
      url.searchParams.set("error", "account_suspended");
      return NextResponse.redirect(url);
    }

    if (!roleCanAccess(role, rule.role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  return supabaseResponse;
}
