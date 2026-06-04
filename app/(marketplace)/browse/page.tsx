import type { Metadata } from "next";
import Link from "next/link";
import { getActiveListingsPage, type BrowseFilters } from "@/lib/marketplace/listings";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { BrowseFilters as FiltersSidebar } from "@/components/marketplace/BrowseFilters";
import { BrowseToolbar } from "@/components/marketplace/BrowseToolbar";
import { Pagination } from "@/components/marketplace/Pagination";
import { Reveal } from "@/components/ui/Reveal";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { AuthMethod } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Shop the Collection",
  description:
    "Browse authenticated bags, watches, jewellery and shoes available to buy.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Shop the Collection — D&D Luxury",
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

  const filters: BrowseFilters = {
    q: first(params.q),
    categories: asArray(params.category),
    brands: asArray(params.brand),
    conditions: asArray(params.condition),
    methods: asArray(params.method).filter((m): m is AuthMethod =>
      VALID_METHODS.includes(m as AuthMethod),
    ),
    minCents: Number.isFinite(minRands) && minRands > 0 ? Math.round(minRands * 100) : undefined,
    maxCents: Number.isFinite(maxRands) && maxRands > 0 ? Math.round(maxRands * 100) : undefined,
    sort:
      sortParam === "price-asc" || sortParam === "price-desc"
        ? sortParam
        : "featured",
  };

  const page = Math.max(1, Number(first(params.page)) || 1);
  const PAGE_SIZE = 24;
  const { items: listings, total, totalPages } = await getActiveListingsPage(
    filters,
    page,
    PAGE_SIZE,
  );

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

  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 48px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Shop</span>
          </nav>
          <div className="eyebrow mb-4">The collection</div>
          <h1 style={{ fontSize: "clamp(34px,4.5vw,56px)" }}>Pieces in residence.</h1>
          <p className="mt-4 max-w-[620px] text-[15px] text-ink-muted">
            Every item authenticated, photographed and insured up to R500,000 —
            available to purchase outright.
          </p>
        </div>
      </header>

      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-10 py-16 lg:grid-cols-[280px_1fr] lg:gap-14">
          <FiltersSidebar />

          <main className="min-w-0">
            <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-border-soft pb-5">
              <div className="text-[14px] text-ink-muted">
                <strong className="text-ink">{total}</strong>{" "}
                {total === 1 ? "piece" : "pieces"}
              </div>
              <BrowseToolbar />
            </div>

            {listings.length === 0 ? (
              <div className="rounded-[3px] border border-dashed border-border px-6 py-24 text-center text-ink-muted">
                No pieces match your filters yet. Try widening your search.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((l, i) => (
                    <Reveal key={l.id} delay={Math.min(i, 6) * 45}>
                      <ListingCard listing={l} />
                    </Reveal>
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
