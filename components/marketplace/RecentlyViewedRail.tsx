"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getRecentlyViewed } from "@/lib/marketplace/recently-viewed";
import { getRecentlyViewedAction } from "@/lib/marketplace/recently-viewed-action";
import type { ListingCardData } from "@/lib/marketplace/listings";

/**
 * RECENTLY VIEWED rail (feature 9) — homepage resurfacing of the visitor's last
 * viewed pieces.
 *
 * Client-only by necessity: the ids live in localStorage (written by the PDP's
 * <RecentlyViewed> writer), unknown at SSR. On mount it reads the ids, then
 * fetches full cards through the getRecentlyViewedAction Server Action (which
 * wraps lane B's getListingsByIds, preserving most-recent-first order and
 * dropping anything no longer active/sold).
 *
 * Renders nothing until it has resolved at least one card, so it never flashes
 * an empty heading and is simply absent for first-time visitors. Cards default
 * to un-saved (no server saved-state on the client) — acceptable for a
 * personal, ephemeral rail. 390px-safe via the shared scroll-snap ladder.
 */
export function RecentlyViewedRail() {
  const [items, setItems] = useState<ListingCardData[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ids = getRecentlyViewed();
    if (ids.length === 0) return;

    getRecentlyViewedAction(ids)
      .then((cards) => {
        if (!cancelled) setItems(cards);
      })
      .catch(() => {
        // non-essential rail — silently stay hidden on failure
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border-soft" style={{ padding: "72px 0 80px" }}>
      <div className="dnd-container">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow mb-3">Pick up where you left off</div>
            <h2 className="font-serif" style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>
              Recently viewed.
            </h2>
          </div>
          <Link href="/browse" className="btn btn-outline btn-sm shrink-0">
            Browse all <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>

        <div className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-7 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-7 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {items.map((l, i) => (
            <Reveal
              key={l.id}
              delay={Math.min(i, 3) * 60}
              className="min-w-0 shrink-0 basis-[82%] snap-start sm:basis-auto"
            >
              <ListingCard listing={l} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
