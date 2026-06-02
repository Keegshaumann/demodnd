import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthMethod,
  Listing,
  ListingImage,
} from "@/lib/supabase/database.types";

export interface ListingCardData {
  id: string;
  title: string;
  brand: string;
  category: string;
  condition: string;
  year: number | null;
  priceCents: number;
  authMethod: AuthMethod;
  imageUrl: string | null;
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
  sort?: "featured" | "price-asc" | "price-desc";
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

/** Active listings matching the browse filters, each with a cover image. */
export async function getActiveListings(
  filters: BrowseFilters = {},
): Promise<ListingCardData[]> {
  const supabase = await createClient();
  let query = supabase.from("listings").select("*").eq("status", "active");

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

  if (filters.q) {
    const s = sanitizeSearch(filters.q);
    if (s) {
      query = query.or(
        `title.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`,
      );
    }
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price_cents", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data } = await query;
  const listings: Listing[] = data ?? [];
  const cover = await coverImages(listings.map((l) => l.id));

  return listings.map((l) => ({
    id: l.id,
    title: l.title,
    brand: l.brand,
    category: l.category,
    condition: l.condition,
    year: l.year,
    priceCents: l.price_cents,
    authMethod: l.auth_method,
    imageUrl: cover.get(l.id) ?? null,
  }));
}

export interface ListingDetail extends Listing {
  images: ListingImage[];
}

/** Full listing for the detail page (any status — caller checks visibility). */
export async function getListingById(id: string): Promise<ListingDetail | null> {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listing) return null;

  const { data: images } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  return { ...listing, images: images ?? [] };
}

/** A few other active listings for the "similar pieces" rail. */
export async function getSimilarListings(
  listing: Pick<Listing, "id" | "category">,
  limit = 4,
): Promise<ListingCardData[]> {
  const all = await getActiveListings({ categories: [listing.category] });
  return all.filter((l) => l.id !== listing.id).slice(0, limit);
}
