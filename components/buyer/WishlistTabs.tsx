import Link from "next/link";

export type WishlistTab = "saved" | "alerts";

const TABS: { key: WishlistTab; href: string; label: string }[] = [
  { key: "saved", href: "/buyer/wishlist", label: "Saved pieces" },
  { key: "alerts", href: "/buyer/wishlist?tab=alerts", label: "Sourcing alerts" },
];

/**
 * In-page sub-tabs for the wishlist surface — "Saved pieces" (favourites) and
 * "Sourcing alerts" (the want-to-source form). Tab state lives in the `?tab=`
 * query param so each view is linkable and the server renders the right one.
 * Visual treatment is a quieter underline row that sits below the account-level
 * BuyerTabs without competing with it.
 */
export function WishlistTabs({ active }: { active: WishlistTab }) {
  return (
    <nav className="mb-8 flex gap-1 border-b border-border-soft">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
              isActive
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
