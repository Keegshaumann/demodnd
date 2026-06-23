import { BRANDS } from "@/lib/marketplace/constants";

/**
 * Brand ↔ URL-slug helpers for the shop-by-designer route (/designer/<slug>).
 *
 * Plain module (no "use server" / "server-only") — pure, side-effect-free string
 * functions, safe to import from both client and server. The diacritic fold
 * mirrors `lib/marketplace/constants.ts` (NFD → strip combining marks) so
 * "Hermès" and "Hermes" collapse to the same slug, and matches the inline
 * slugifier in lib/brands/follow.ts so revalidatePath targets line up.
 */

/** "Hermès" → "hermes", "Louis Vuitton" → "louis-vuitton". */
export function brandToSlug(brand: string): string {
  return brand
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a URL slug back to the canonical brand string from {@link BRANDS}, or
 * null when no known maison matches. Comparison is slug-vs-slug so a request for
 * "/designer/louis-vuitton" resolves to "Louis Vuitton" regardless of casing or
 * diacritics in the incoming path.
 */
export function slugToBrand(slug: string): string | null {
  const target = brandToSlug(slug);
  if (!target) return null;
  return BRANDS.find((b) => brandToSlug(b) === target) ?? null;
}
