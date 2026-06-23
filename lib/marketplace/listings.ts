import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthMethod,
  Listing,
  ListingImage,
  ListingStatus,
} from "@/lib/supabase/database.types";

export interface ListingCardData {
  id: string;
  title: string;
  brand: string;
  category: string;
  condition: string;
  year: number | null;
  priceCents: number;
  /** Optional original-retail (MSRP) anchor in ZAR cents. Null when unset.
   *  The "X% below retail" deal treatment only renders when this is present
   *  AND strictly greater than priceCents (see lib/marketplace/pricing.ts). */
  retailCents: number | null;
  authMethod: AuthMethod;
  imageUrl: string | null;
  /** Drives the card's "Sold" treatment. Active for grid results, but seller /
   *  homepage / "similar" rails can surface sold pieces, so the card needs it. */
  status: ListingStatus;
}

export interface BrowseFilters {
  q?: string;
  categories?: string[];
  brands?: string[];
  conditions?: string[];
  methods?: AuthMethod[];
  minCents?: number;
  maxCents?: number;
  sellerId?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "newest";
}

/** Strip characters that would break a PostgREST `or` filter string. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%]/g, "").trim().slice(0, 80);
}

/** First image (lowest sort_order) for each listing id. */
async function coverImages(
  listingIds: string[],
): Promise<Map<string, string>> {
  const cover = new Map<string, string>();
  if (listingIds.length === 0) return cover;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_images")
    .select("listing_id, url, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });
  (data ?? []).forEach((img) => {
    if (!cover.has(img.listing_id)) cover.set(img.listing_id, img.url);
  });
  return cover;
}

export interface ListingsPage {
  items: ListingCardData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** True when the exact/substring search found nothing and these results are
   *  the trigram "closest matches" fallback — lets the UI say so explicitly. */
  isFuzzyFallback: boolean;
  /** The (sanitised) query that produced this page, echoed back for the
   *  "closest matches for …" notice. Undefined when no search term was given. */
  query?: string;
}

export function toCardData(l: Listing, cover: Map<string, string>): ListingCardData {
  return {
    id: l.id,
    title: l.title,
    brand: l.brand,
    category: l.category,
    condition: l.condition,
    year: l.year,
    priceCents: l.price_cents,
    retailCents: l.retail_price_cents,
    authMethod: l.auth_method,
    imageUrl: cover.get(l.id) ?? null,
    status: l.status,
  };
}

/** Page the supabase rows into a fully-formed {@link ListingsPage} (resolves
 *  cover images + computes pagination). Shared by both search phases. */
async function buildPage(
  listings: Listing[],
  total: number,
  safePage: number,
  pageSize: number,
  isFuzzyFallback: boolean,
  query: string | undefined,
): Promise<ListingsPage> {
  const cover = await coverImages(listings.map((l) => l.id));
  return {
    items: listings.map((l) => toCardData(l, cover)),
    total,
    page: safePage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isFuzzyFallback,
    query,
  };
}

/**
 * One page of active listings matching the browse filters, plus the total count
 * (for pagination). `select("*", { count: "exact" })` + `.range()` keeps the
 * browse grid bounded instead of loading the entire catalogue at once.
 *
 * Search is two-phase when `filters.q` is present: an exact/substring pass on
 * the indexed `ilike` columns first (the fast common case), and ONLY if that
 * returns nothing, a pg_trgm "closest matches" fallback via the
 * `search_listings_fuzzy` RPC so a typo like "birkim" still surfaces "Birkin".
 * `isFuzzyFallback` flags the fallback so the UI can say "showing closest
 * matches". Both phases apply the same structured filters; the fallback orders
 * by similarity (closest-first is the right UX), so app sort is honoured only
 * on the exact path.
 */
export async function getActiveListingsPage(
  filters: BrowseFilters = {},
  page = 1,
  pageSize = 24,
): Promise<ListingsPage> {
  const supabase = await createClient();
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;

  const searchTerm = filters.q ? sanitizeSearch(filters.q) : "";

  let query = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active");

  if (filters.sellerId) query = query.eq("seller_id", filters.sellerId);
  if (filters.categories?.length)
    query = query.in("category", filters.categories);
  if (filters.brands?.length) query = query.in("brand", filters.brands);
  if (filters.conditions?.length)
    query = query.in("condition", filters.conditions);
  if (filters.methods?.length)
    query = query.in("auth_method", filters.methods);
  if (typeof filters.minCents === "number")
    query = query.gte("price_cents", filters.minCents);
  if (typeof filters.maxCents === "number")
    query = query.lte("price_cents", filters.maxCents);

  if (searchTerm) {
    query = query.or(
      `title.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`,
    );
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price_cents", { ascending: false });
      break;
    case "newest":
      // "Newest" sort: strictly most-recent first (no featured weighting).
      // created_at desc is already covered by the existing active indexes.
      query = query.order("created_at", { ascending: false });
      break;
    default:
      // "Featured" sort: admin-curated pieces first (silent — no public
      // badge), newest after. Served by listings_active_featured_idx.
      query = query
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
  }

  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  // PUB-2: surface a real fetch failure (throws to the route error.tsx boundary)
  // instead of silently rendering an empty catalogue that looks like "no stock".
  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  const listings: Listing[] = data ?? [];
  const total = count ?? listings.length;
  const echoQuery = searchTerm || undefined;

  // Exact/substring hit (or no search term at all): the fast indexed path.
  if (!searchTerm || total > 0) {
    return buildPage(listings, total, safePage, pageSize, false, echoQuery);
  }

  // FUZZY FALLBACK — the exact phase found nothing for a real search term.
  // Pay the trigram scan only now. RLS (public reads active) still governs via
  // the SECURITY INVOKER RPC. Pass the same structured filters; empty arrays /
  // unset bounds become null so the RPC's `is null or …` guards skip them.
  const rpcArgs = {
    p_q: searchTerm,
    p_categories: filters.categories?.length ? filters.categories : null,
    p_brands: filters.brands?.length ? filters.brands : null,
    p_conditions: filters.conditions?.length ? filters.conditions : null,
    p_methods: filters.methods?.length ? filters.methods : null,
    p_min_cents: typeof filters.minCents === "number" ? filters.minCents : null,
    p_max_cents: typeof filters.maxCents === "number" ? filters.maxCents : null,
    p_seller_id: filters.sellerId ?? null,
  };

  const [{ data: fuzzyRows, error: fuzzyErr }, { data: fuzzyCount }] =
    await Promise.all([
      supabase.rpc("search_listings_fuzzy", {
        ...rpcArgs,
        p_limit: pageSize,
        p_offset: from,
      }),
      supabase.rpc("search_listings_fuzzy_count", rpcArgs),
    ]);
  // A failed fuzzy fallback is non-fatal: degrade to the (empty) exact result
  // and let the page render its normal empty-state rather than 500.
  if (fuzzyErr) return buildPage([], 0, safePage, pageSize, false, echoQuery);

  const fuzzyListings: Listing[] = fuzzyRows ?? [];
  const fuzzyTotal =
    typeof fuzzyCount === "number" ? fuzzyCount : fuzzyListings.length;

  // No closest matches either: fall through as a non-fallback empty result so
  // the page shows its standard "nothing matches" state.
  if (fuzzyListings.length === 0) {
    return buildPage([], fuzzyTotal, safePage, pageSize, false, echoQuery);
  }

  return buildPage(
    fuzzyListings,
    fuzzyTotal,
    safePage,
    pageSize,
    true,
    echoQuery,
  );
}

/**
 * Active listings matching the browse filters (capped). Used where a full,
 * unpaginated set is fine (seller profile grid, "similar pieces").
 */
export async function getActiveListings(
  filters: BrowseFilters = {},
): Promise<ListingCardData[]> {
  const { items } = await getActiveListingsPage(filters, 1, 1000);
  return items;
}

export interface ListingDetail extends Listing {
  images: ListingImage[];
  /** Camel-cased mirror of `retail_price_cents` so the PDP shares the same
   *  `retailCents` shape as {@link ListingCardData}. Null when unset. */
  retailCents: number | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Full listing for the detail page (any status — caller checks visibility).
 * Wrapped in React cache() so generateMetadata and the page body share one
 * fetch per request instead of hitting the DB twice.
 */
export const getListingById = cache(
  async (id: string): Promise<ListingDetail | null> => {
    // A non-UUID id is simply "not found" (404) — don't let the invalid-uuid DB
    // error below turn a junk URL into a 500 (PUB-2 made errors throw).
    if (!UUID_RE.test(id)) return null;

    const supabase = await createClient();
    // Both queries key off the id alone, so run them in parallel.
    const [{ data: listing, error }, { data: images }] = await Promise.all([
      supabase.from("listings").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", id)
        .order("sort_order", { ascending: true }),
    ]);
    // Distinguish a genuine not-found (null) from a fetch error: a swallowed error
    // would otherwise 404 a real listing during a transient DB hiccup (PUB-2).
    if (error) throw new Error(`Failed to load listing: ${error.message}`);
    if (!listing) return null;

    return {
      ...listing,
      images: images ?? [],
      retailCents: listing.retail_price_cents,
    };
  },
);

/** A few other active listings for the "similar pieces" rail. */
export async function getSimilarListings(
  listing: Pick<Listing, "id" | "category">,
  limit = 4,
): Promise<ListingCardData[]> {
  // The "similar pieces" rail is secondary — never let its failure take down the
  // whole listing page (getActiveListingsPage throws on a real error, PUB-2).
  try {
    // Fetch only limit + 1 rows (the current listing may be among them)
    // instead of the whole category.
    const { items } = await getActiveListingsPage(
      { categories: [listing.category] },
      1,
      limit + 1,
    );
    return items.filter((l) => l.id !== listing.id).slice(0, limit);
  } catch {
    return [];
  }
}
