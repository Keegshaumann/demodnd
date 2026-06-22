import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Comparable-sales summary drawn from D&D's OWN catalogue — the "own comps"
 * half of the price estimator. Aggregates active + sold listings of the same
 * brand (optionally same category) into a price distribution the AI estimate is
 * grounded against. Read-only; uses the service-role client so sold listings are
 * included regardless of RLS visibility (callers must already be authorised).
 */
export interface Comps {
  count: number;
  minCents: number;
  maxCents: number;
  medianCents: number;
}

function median(sortedCents: number[]): number {
  const n = sortedCents.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? Math.round((sortedCents[mid - 1]! + sortedCents[mid]!) / 2)
    : sortedCents[mid]!;
}

export async function getBrandComps(
  brand: string,
  category?: string,
): Promise<Comps | null> {
  const db = createAdminClient();
  let query = db
    .from("listings")
    .select("price_cents")
    .in("status", ["active", "sold"])
    .ilike("brand", brand.trim());
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;

  const prices = data
    .map((row) => row.price_cents)
    .filter((c): c is number => typeof c === "number" && c > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;

  return {
    count: prices.length,
    minCents: prices[0]!,
    maxCents: prices[prices.length - 1]!,
    medianCents: median(prices),
  };
}
