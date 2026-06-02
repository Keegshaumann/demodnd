"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Auth Queue" },
  { href: "/admin/orders", label: "Sales Ledger" },
  { href: "/admin/tiers", label: "Tiers" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-[3px] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${
              active
                ? "bg-gold text-white"
                : "text-ink-muted hover:bg-deep hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
