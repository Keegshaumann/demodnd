import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * Editorial hero for a shop-by-designer page. Monochrome: the maison name set in
 * Cormorant (font-serif), an optional blurb, and the live piece count. The
 * Follow control is rendered by the page (lane G's FollowBrandButton) and slotted
 * in via `action` so this stays a pure presentational server component.
 * 390px-safe: the name clamps and the action wraps below on narrow screens.
 */
export function DesignerHero({
  brand,
  blurb,
  count,
  action,
}: {
  brand: string;
  blurb: string;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border-soft" style={{ padding: "64px 0 44px" }}>
      <div className="dnd-container">
        <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRightIcon width={13} height={13} />
          <Link href="/browse" className="hover:text-ink">
            Shop
          </Link>
          <ChevronRightIcon width={13} height={13} />
          <span className="truncate text-ink-muted">{brand}</span>
        </nav>

        <div className="eyebrow mb-4">The maison</div>

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            <h1
              className="text-balance"
              style={{ fontSize: "clamp(34px,4.5vw,56px)", lineHeight: 1.05 }}
            >
              {brand}
            </h1>
            {blurb && (
              <p className="mt-4 max-w-[620px] text-pretty text-[15px] leading-relaxed text-ink-muted">
                {blurb}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        <p className="mt-6 text-[13px] text-ink-dim">
          <span className="font-medium text-ink tabular-nums">{count}</span>{" "}
          {count === 1 ? "piece" : "pieces"} in residence
        </p>
      </div>
    </header>
  );
}
