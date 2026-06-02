import { requireRole } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Admin area shell. Middleware gates `/admin/*` by role; this layout enforces it
 * again server-side (defense-in-depth) and renders the admin chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
