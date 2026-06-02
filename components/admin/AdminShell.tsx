import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/auth-portal/SignOutButton";

/** Admin chrome: a slim top bar with nav + sign-out, then the page content. */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 px-6 py-3.5 md:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-serif text-[18px] uppercase tracking-[0.16em] text-gold"
            >
              D&amp;D Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-ink-dim sm:inline">
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1480px] px-6 py-10 md:px-10">
        {children}
      </main>
    </div>
  );
}
