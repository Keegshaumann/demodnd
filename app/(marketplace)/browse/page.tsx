import type { Metadata } from "next";
import Link from "next/link";
import { getActiveListingsPage, type BrowseFilters } from "@/lib/marketplace/listings";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { QuickViewProvider } from "@/components/marketplace/QuickViewProvider";
import { QuickViewModal } from "@/components/marketplace/QuickViewModal";
import { NewInLink } from "@/components/marketplace/NewInLink";
import {
  BrowseFilterBar,
  BrowseFilterDrawer,
  ActiveFilterChips,
} from "@/components/marketplace/BrowseFilters";
import { BrowseToolbar } from "@/components/marketplace/BrowseToolbar";
import { SaveSearchButton } from "@/components/marketplace/SaveSearchButton";
import { Pagination } from "@/components/marketplace/Pagination";
import { Reveal } from "@/components/ui/Reveal";
import { ChevronRightIcon, SearchIcon, ArrowRightIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSavedListingIds } from "@/lib/marketplace/saved";
import { getSaveCounts } from "@/lib/marketplace/social";
import type { AuthMethod } from "@/lib/supabase/database.types";
import { cookies } from "next/headers";
import { GENDER_COOKIE, parseGender } from "@/lib/marketplace/gender";
import { parseSeason } from "@/lib/marketplace/season";

export const metadata: Metadata = {
  title: "Shop the Collection",
  description:
    "Browse authenticated bags, watches, jewellery and shoes available to buy.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Shop the Collection · D&D Luxury",
    description:
      "Browse authenticated bags, watches, jewellery and shoes available to buy.",
    url: "/browse",
    type: "website",
  },
};

const VALID_METHODS: AuthMethod[] = ["photo", "courier", "dropoff"];

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const minRands = Number(first(params.min));
  const maxRands = Number(first(params.max));
  const sortParam = first(params.sort);

  // Gender scope: an explicit ?gender= (incl. "all" → no filter) wins, otherwise
  // fall back to the gate's cookie. Lets the toggle override a saved preference.
  const genderParam = first(params.gender);
  const gender =
    genderParam !== undefined
      ? (parseGender(genderParam) ?? undefined)
      : (parseGender((await cookies()).get(GENDER_COOKIE)?.value) ?? undefined);

  const filters: BrowseFilters = {
    q: first(params.q),
    gender,
    featured: first(params.featured) === "1" || undefined,
    season: parseSeason(first(params.season)) ?? undefined,
    categories: asArray(params.category),
    brands: asArray(params.brand),
    conditions: asArray(params.condition),
    methods: asArray(params.method).filter((m): m is AuthMethod =>
      VALID_METHODS.includes(m as AuthMethod),
    ),
    minCents: Number.isFinite(minRands) && minRands > 0 ? Math.round(minRands * 100) : undefined,
    maxCents: Number.isFinite(maxRands) && maxRands > 0 ? Math.round(maxRands * 100) : undefined,
    sort:
      sortParam === "price-asc" ||
      sortParam === "price-desc" ||
      sortParam === "newest"
        ? sortParam
        : "featured",
  };

  const page = Math.max(1, Number(first(params.page)) || 1);
  const PAGE_SIZE = 24;
  const [
    {
      items: listings,
      total,
      totalPages,
      isFuzzyFallback,
      query,
    },
    user,
  ] = await Promise.all([
    getActiveListingsPage(filters, page, PAGE_SIZE),
    getCurrentUser(),
  ]);

  // Hydrate per-card saved-state (mirrors the homepage / PDP) so the grid cards
  // — and the QuickView modal opened from them — show the correct favourite
  // state. Empty Set for guests. Save counts (a global, RLS-bypassing aggregate)
  // back the "Trending" badge on cards that clear the threshold; view counts are
  // skipped here since ListingCardData doesn't carry view_count (passing it would
  // mean touching lib/marketplace/listings.ts, owned by no lane).
  const [savedIds, saveCounts] = await Promise.all([
    getSavedListingIds(user?.id ?? null),
    getSaveCounts(listings.map((l) => l.id)),
  ]);

  // Build page hrefs that preserve the active filters (everything but `page`).
  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page") continue;
    for (const val of asArray(v)) baseQs.append(k, val);
  }
  const hrefFor = (p: number) => {
    const sp = new URLSearchParams(baseQs);
    sp.set("page", String(p));
    return `/browse?${sp.toString()}`;
  };
  // Gender-toggle hrefs: preserve other filters, reset paging. null = Everything.
  const genderHref = (g: "women" | "men" | null) => {
    const sp = new URLSearchParams(baseQs);
    sp.delete("gender");
    if (g) sp.set("gender", g);
    const qs = sp.toString();
    return qs ? `/browse?${qs}` : "/browse";
  };

  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 56px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Shop</span>
          </nav>
          <div className="eyebrow mb-4">The collection</div>
          <h1 className="text-balance" style={{ fontSize: "clamp(34px,4.5vw,56px)" }}>
            Pieces in residence.
          </h1>
          <p className="mt-4 max-w-[620px] text-pretty text-[15px] text-ink-muted">
            Every item authenticated, photographed and insured to R500,000,
            available to purchase outright.
          </p>
        </div>
      </header>

      <div className="dnd-container">
        <main className="min-w-0 py-12 lg:py-14">
          {/* Gender scope — Women / Men / Everything (Vestiaire-style), reads
              left-to-right and drives the whole grid via ?gender=. */}
          <div className="mb-7 flex items-center gap-2">
            {(
              [
                { v: "women", l: "Women" },
                { v: "men", l: "Men" },
                { v: null, l: "Everything" },
              ] as const
            ).map((o) => {
              const active = (o.v ?? undefined) === gender;
              return (
                <Link
                  key={o.l}
                  href={genderHref(o.v)}
                  className={`rounded-full border px-5 py-2 text-[12px] font-medium uppercase tracking-[0.12em] transition-colors ${
                    active
                      ? "border-gold bg-gold text-white"
                      : "border-border text-ink-muted hover:border-gold hover:text-ink"
                  }`}
                >
                  {o.l}
                </Link>
              );
            })}
          </div>
          {/* Horizontal filter bar (rebag-style) — facet dropdowns on the left
              (drawer trigger below lg), search + sort on the right. */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-6 lg:flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <BrowseFilterDrawer />
              <BrowseFilterBar />
            </div>
            <div className="shrink-0">
              <BrowseToolbar />
            </div>
          </div>

          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="text-[14px] text-ink-muted">
                <strong className="text-ink tabular-nums">{total}</strong>{" "}
                {total === 1 ? "piece" : "pieces"}
              </div>
              <SaveSearchButton />
            </div>
            {/* Prominent New In entry point (feature 13) — links into the
                existing newest-first sort so new arrivals reuse this grid. */}
            <NewInLink />
          </div>

          <ActiveFilterChips />

          {isFuzzyFallback && query && (
            <p className="mb-7 -mt-1 text-[13px] text-ink-muted">
              No exact match for{" "}
              <span className="text-ink">“{query}”</span> — showing closest
              matches.
            </p>
          )}

          {listings.length === 0 ? (
            <div className="flex flex-col items-center rounded-[3px] border border-dashed border-border bg-surface px-6 py-20 text-center">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-dim">
                <SearchIcon width={20} height={20} />
              </span>
              <h2 className="font-serif text-2xl">Nothing matches yet.</h2>
              <p className="mt-2 max-w-[360px] text-[14px] text-ink-muted">
                No pieces fit these filters right now. Widen your search, or tell
                our concierge what you&apos;re hunting for.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/browse" className="btn btn-outline btn-sm">
                  Clear filters
                </Link>
                <Link href="/concierge" className="btn btn-primary btn-sm">
                  Ask the concierge <ArrowRightIcon width={15} height={15} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* QuickViewProvider holds the open-listing state; cards in the
                  grid open it via their own Quick-view trigger (feature 12). The
                  modal lives inside the provider so the context is in scope. The
                  card passes its own ListingCardData + isSaved to openQuickView,
                  so the modal's FavouriteButton hydrates with the right state —
                  hence saved-state is fetched on this page. */}
              <QuickViewProvider>
                <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {listings.map((l, i) => (
                    <Reveal key={l.id} delay={Math.min(i, 6) * 45}>
                      <ListingCard
                        listing={l}
                        priority={i < 3}
                        isSaved={savedIds.has(l.id)}
                        saveCount={saveCounts.get(l.id) ?? 0}
                      />
                    </Reveal>
                  ))}
                </div>
                <QuickViewModal />
              </QuickViewProvider>
              <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
            </>
          )}
        </main>
      </div>
    </>
  );
}
