"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, MenuIcon, CloseIcon } from "@/components/ui/icons";

export interface NavUser {
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
 */
export function SiteHeader({ user = null }: { user?: NavUser | null }) {
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
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-6 py-4 md:px-10">
        <Link href="/" className="flex flex-shrink-0 items-center">
          <Image
            src="/logo.svg"
            alt="D&D Luxury"
            width={42}
            height={42}
            priority
          />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? "text-gold after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gold"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={submitSearch}
          className="hidden min-w-0 max-w-[340px] flex-1 items-center overflow-hidden rounded-[3px] border border-border bg-surface transition-colors focus-within:border-gold md:flex"
        >
          <input
            type="text"
            name="q"
            aria-label="Search pieces"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pieces..."
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-dim"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex flex-shrink-0 items-center self-stretch px-3 py-2.5 text-ink-dim transition-colors hover:text-gold"
          >
            <SearchIcon width={16} height={16} />
          </button>
        </form>

        <div className="flex flex-shrink-0 items-center gap-2">
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
        </div>
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
