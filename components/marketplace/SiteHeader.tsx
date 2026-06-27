"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, MenuIcon, CloseIcon, HeartIcon } from "@/components/ui/icons";
import { NotificationBell } from "@/components/marketplace/NotificationBell";
import type { NotificationItem } from "@/lib/notifications/queries";
import { CATEGORIES, BRANDS } from "@/lib/marketplace/constants";
import { brandToSlug } from "@/lib/brands/slug";

export interface NavUser {
  /** Auth user id — used to hydrate the notification bell server-side. */
  id: string;
  role: "buyer" | "seller" | "admin";
  email: string;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Shop" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/concierge", label: "Concierge" },
];

function dashboardHref(role: NavUser["role"]): string {
  return role === "admin"
    ? "/admin"
    : role === "seller"
      ? "/seller"
      : "/buyer";
}

/**
 * Site navigation — mirrors `.nav` from the demo. Auth-aware: pass `user` to
 * show the dashboard link; signed-out shows Sign In. No rental anywhere.
 *
 * When signed in, the layouts also pass `unreadCount` + `recentNotifications`
 * (fetched server-side) so we can render the notification bell with no client
 * round-trip. The bell stays hidden for guests.
 */
export function SiteHeader({
  user = null,
  unreadCount,
  recentNotifications,
}: {
  user?: NavUser | null;
  unreadCount?: number;
  recentNotifications?: NotificationItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    setMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-[100] border-b border-border-soft bg-bg/95 backdrop-blur-xl">
      {/* Row 1 — search (left) · logo (centre) · actions (right), Vestiaire-style */}
      <div className="mx-auto grid max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4 md:px-10">
        {/* Left: desktop search pill / mobile menu trigger */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-[3px] border border-border p-2.5 text-ink lg:hidden"
          >
            {menuOpen ? (
              <CloseIcon width={18} height={18} />
            ) : (
              <MenuIcon width={18} height={18} />
            )}
          </button>
          <form
            onSubmit={submitSearch}
            className="hidden w-full max-w-[360px] items-center overflow-hidden rounded-full border border-border bg-surface transition-colors focus-within:border-gold lg:flex"
          >
            <span className="flex flex-shrink-0 items-center pl-4 text-ink-dim">
              <SearchIcon width={16} height={16} />
            </span>
            <input
              type="text"
              name="q"
              aria-label="Search pieces"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand, piece..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-dim"
            />
          </form>
        </div>

        {/* Centre: logo */}
        <Link href="/" className="flex items-center justify-center">
          <Image src="/logo.svg" alt="D&D Luxury" width={48} height={48} priority />
        </Link>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-1.5">
          {user && unreadCount !== undefined && (
            <NotificationBell
              initialUnread={unreadCount}
              initialItems={recentNotifications ?? []}
            />
          )}
          {user?.role === "buyer" && (
            <Link
              href="/buyer/wishlist"
              aria-label="Wishlist"
              className="hidden rounded-full p-2.5 text-ink-muted transition-colors hover:text-ink sm:inline-flex"
            >
              <HeartIcon width={18} height={18} />
            </Link>
          )}
          {user ? (
            <Link
              href={dashboardHref(user.role)}
              className="btn btn-ghost hidden sm:inline-flex"
            >
              Account
            </Link>
          ) : (
            <Link href="/signin" className="btn btn-ghost hidden sm:inline-flex">
              Sign In
            </Link>
          )}
          <Link href="/sell" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Sell With Us
          </Link>
        </div>
      </div>

      {/* Row 2 — primary nav, centred under the logo (desktop only) */}
      <div className="hidden border-t border-border-soft lg:block">
        <ul className="mx-auto flex max-w-[1480px] items-center justify-center gap-9 px-6 py-3 md:px-10">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li
                key={link.href}
                className={link.label === "Shop" ? "group relative" : undefined}
              >
                <Link
                  href={link.href}
                  className={`relative py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "text-gold after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
                {link.label === "Shop" && (
                  /* Hover mega-menu — pure CSS, exposes the full catalogue tree.
                     The pt-3 bridges the gap to the link. */
                  <div className="invisible absolute left-1/2 top-full z-[110] w-[600px] -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="grid grid-cols-3 gap-8 rounded-[3px] border border-border-soft bg-bg p-8 shadow-xl">
                      <div>
                        <div className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-dim">
                          Category
                        </div>
                        <ul className="space-y-2.5">
                          {CATEGORIES.map((c) => (
                            <li key={c.value}>
                              <Link
                                href={`/browse?category=${c.value}`}
                                className="text-[13px] text-ink-muted transition-colors hover:text-gold"
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="col-span-2">
                        <div className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-dim">
                          Designers
                        </div>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          {BRANDS.slice(0, 10).map((b) => (
                            <li key={b}>
                              <Link
                                href={`/designer/${brandToSlug(b)}`}
                                className="text-[13px] text-ink-muted transition-colors hover:text-gold"
                              >
                                {b}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/authentication"
                          className="mt-5 inline-flex text-[11px] uppercase tracking-[0.16em] text-gold hover:underline"
                        >
                          How we authenticate →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border-soft bg-bg px-6 py-4 lg:hidden">
          <form
            onSubmit={submitSearch}
            className="mb-4 flex items-center overflow-hidden rounded-[3px] border border-border bg-surface focus-within:border-gold"
          >
            <input
              type="text"
              name="q"
              aria-label="Search pieces"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pieces..."
              className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] outline-none placeholder:text-ink-dim"
            />
            <button type="submit" aria-label="Search" className="px-3 text-ink-dim">
              <SearchIcon width={16} height={16} />
            </button>
          </form>
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <Link
                href={dashboardHref(user.role)}
                onClick={() => setMenuOpen(false)}
                className="btn btn-outline btn-block"
              >
                Account
              </Link>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMenuOpen(false)}
                className="btn btn-outline btn-block"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/sell"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary btn-block"
            >
              Sell With Us
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
