import type { UserRole } from "@/lib/supabase/database.types";

/** Where each role lands after sign-in / when redirected from a wrong area. */
export const ROLE_HOME: Record<UserRole, string> = {
  buyer: "/buyer",
  seller: "/seller",
  admin: "/admin",
};

/**
 * Route prefixes that require a specific role. Admin is treated as a superuser
 * and may enter any area. Checked most-specific-first.
 */
export const PROTECTED_PREFIXES: { prefix: string; role: UserRole }[] = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/seller", role: "seller" },
  { prefix: "/buyer", role: "buyer" },
];

/** Returns the protection rule matching a pathname, or null if public. */
export function matchProtected(
  pathname: string,
): { prefix: string; role: UserRole } | null {
  return (
    PROTECTED_PREFIXES.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? null
  );
}

/** Admin may access everything; otherwise the role must match exactly. */
export function roleCanAccess(role: UserRole, required: UserRole): boolean {
  return role === "admin" || role === required;
}
