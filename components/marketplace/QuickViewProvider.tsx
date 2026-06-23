"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ListingCardData } from "@/lib/marketplace/listings";
import { EyeIcon } from "@/components/ui/icons";

/**
 * Quick-view state container. Holds the currently-previewed listing (or null
 * when closed) plus the saved-state the card already knew, so the modal's
 * FavouriteButton hydrates correctly without a server round-trip.
 *
 * Mount ONCE high in a grid-owning page (browse mounts it around its grid and
 * renders <QuickViewModal/> inside). Cards reach `openQuickView` via
 * {@link useQuickView}; the card supplies its OWN ListingCardData + isSaved —
 * the modal needs nothing the card doesn't already have.
 */
export interface QuickViewTarget {
  listing: ListingCardData;
  isSaved: boolean;
}

interface QuickViewContextValue {
  /** The open listing, or null when nothing is being previewed. */
  current: QuickViewTarget | null;
  /** Open the modal for a listing (card passes its own data + saved state). */
  openQuickView: (listing: ListingCardData, isSaved?: boolean) => void;
  /** Close the modal. */
  closeQuickView: () => void;
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<QuickViewTarget | null>(null);

  const openQuickView = useCallback(
    (listing: ListingCardData, isSaved = false) => {
      setCurrent({ listing, isSaved });
    },
    [],
  );

  const closeQuickView = useCallback(() => setCurrent(null), []);

  const value = useMemo<QuickViewContextValue>(
    () => ({ current, openQuickView, closeQuickView }),
    [current, openQuickView, closeQuickView],
  );

  return (
    <QuickViewContext.Provider value={value}>
      {children}
    </QuickViewContext.Provider>
  );
}

/**
 * Read the quick-view controls. Returns null when called outside a provider so
 * a card rendered on a page WITHOUT quick-view (e.g. seller grids) simply omits
 * the affordance instead of crashing — the card guards on this.
 */
export function useQuickView(): QuickViewContextValue | null {
  return useContext(QuickViewContext);
}

/**
 * The card's "Quick view" affordance — a client island so the (server) {@link
 * ListingCard} stays an RSC. Mirrors FavouriteButton: stops the click from
 * bubbling to the parent card <Link> so the modal opens instead of navigating.
 * Renders NOTHING when no provider is mounted (e.g. seller grids, homepage
 * rails), so the card degrades cleanly outside a quick-view context.
 */
export function QuickViewTrigger({
  listing,
  isSaved = false,
}: {
  listing: ListingCardData;
  isSaved?: boolean;
}) {
  const ctx = useQuickView();
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx.openQuickView(listing, isSaved);
      }}
      aria-label="Quick view"
      title="Quick view"
      className="pill pill-glass absolute right-4 top-[58px] z-[2] opacity-0 transition-opacity duration-300 ease-out-soft focus-visible:opacity-100 group-hover:opacity-100"
    >
      <EyeIcon width={13} height={13} aria-hidden />
      <span className="sr-only">Quick view</span>
    </button>
  );
}
