import "server-only";
import {
  getActiveListingsPage,
  type BrowseFilters,
  type ListingCardData,
} from "@/lib/marketplace/listings";

/**
 * CURATED COLLECTIONS / EDITS (feature 10) — config-driven merchandising rails.
 *
 * Each entry pairs an editorial title with (a) the `/browse` URL its "View all"
 * link points at and (b) the {@link BrowseFilters} used to fetch a small preview
 * server-side. There is no admin UI for v1 — the array below is the single
 * source of truth, rendered as titled <CollectionRail> rails on the homepage.
 *
 * This is a `server-only` module rather than a plain constant file because the
 * preview helper reaches into the server-only listings reader; keeping the
 * config beside its fetcher avoids a client/server import split. The `filter`
 * field is a plain serialisable object, so the const itself is harmless if a
 * client were ever to import only the data (it won't — `server-only` guards it).
 *
 * Brands are kept aligned to seeded stock (verified live: Cartier 4, Chanel 3,
 * Rolex 3, Hermès 2 all active). The price edit uses "Under R100,000" because
 * the seeded catalogue has no sub-R10,000 stock (min active price ~R16,900);
 * R100,000 yields ~12 active pieces — a real, non-empty edit. Each rail is
 * hidden by its renderer when its preview comes back empty, so the config is
 * resilient if stock shifts.
 */
export interface CuratedCollection {
  /** Stable key for React lists. */
  key: string;
  /** Small uppercase caption above the title (optional). */
  eyebrow?: string;
  /** Serif rail heading. */
  title: string;
  /** Where "View all" links — a /browse URL with the matching query params. */
  href: string;
  /** Filters used to fetch this edit's preview items server-side. */
  filter: BrowseFilters;
}

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    // "Now Trending" — the promoted/paid placement. Backed by the `featured`
    // flag (D&D's existing promotion mechanism), so it leads the edits.
    key: "now-trending",
    eyebrow: "Promoted",
    title: "Now Trending",
    href: "/browse?featured=1",
    filter: { featured: true },
  },
  {
    key: "hermes-edit",
    eyebrow: "Maison edit",
    title: "The Hermès Edit",
    href: "/browse?brand=Herm%C3%A8s",
    filter: { brands: ["Hermès"] },
  },
  {
    key: "watch-room",
    eyebrow: "Maison edit",
    title: "The Watch Room",
    href: "/browse?category=watches",
    filter: { categories: ["watches"] },
  },
  {
    key: "under-100k",
    eyebrow: "Within reach",
    title: "Under R100,000",
    href: "/browse?max=100000",
    filter: { maxCents: 100_000_00 },
  },
];

/**
 * A small preview slice for a collection — newest-first within the edit's
 * filters. Reuses the existing paged reader (read-only import). Returns [] on
 * any error so a single empty/failed edit never takes the homepage down; the
 * rail component hides itself when this is empty.
 */
export async function getCollectionPreview(
  filter: BrowseFilters,
  limit = 4,
): Promise<ListingCardData[]> {
  try {
    const { items } = await getActiveListingsPage(
      { ...filter, sort: filter.sort ?? "newest" },
      1,
      limit,
    );
    return items;
  } catch {
    return [];
  }
}
