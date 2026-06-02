"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/seller", label: "Overview" },
  { href: "/seller/listings", label: "Listings" },
  { href: "/seller/sales", label: "Sales" },
  { href: "/seller/subscription", label: "Plan" },
  { href: "/seller/profile", label: "Profile" },
];

export function SellerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/seller"
            ? pathname === "/seller"
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
