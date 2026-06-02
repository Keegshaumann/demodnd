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
 *
 * NOTE: `/seller` is special — it hosts BOTH the role-gated seller dashboard
 * (`/seller`, `/seller/listings`, …) AND the PUBLIC reputation profiles
 * (`/seller/[username]`). So seller gating is handled by section, not prefix.
 */
export const PROTECTED_PREFIXES: { prefix: string; role: UserRole }[] = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/buyer", role: "buyer" },
];

/** The seller dashboard sections (everything else under /seller is public). */
const SELLER_DASHBOARD_SECTIONS = [
  "/seller/listings",
  "/seller/sales",
  "/seller/subscription",
  "/seller/profile",
];

function isSellerDashboard(pathname: string): boolean {
  if (pathname === "/seller") return true;
  return SELLER_DASHBOARD_SECTIONS.some(
    (s) => pathname === s || pathname.startsWith(`${s}/`),
  );
}

/** Returns the protection rule matching a pathname, or null if public. */
export function matchProtected(
  pathname: string,
): { prefix: string; role: UserRole } | null {
  const prefixMatch = PROTECTED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (prefixMatch) return prefixMatch;
  if (isSellerDashboard(pathname)) return { prefix: "/seller", role: "seller" };
  return null;
}

/** Admin may access everything; otherwise the role must match exactly. */
export function roleCanAccess(role: UserRole, required: UserRole): boolean {
  return role === "admin" || role === required;
}
