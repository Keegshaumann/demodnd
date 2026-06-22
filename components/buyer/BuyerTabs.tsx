"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/buyer", label: "Overview" },
  { href: "/buyer/orders", label: "Orders" },
  { href: "/buyer/offers", label: "Offers" },
  { href: "/buyer/wishlist", label: "Wishlist" },
];

export function BuyerTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex gap-1 border-b border-border-soft">
      {TABS.map((t) => {
        const active =
          t.href === "/buyer" ? pathname === "/buyer" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-dim hover:text-ink-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
