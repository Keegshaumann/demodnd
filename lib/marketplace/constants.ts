import type { AuthMethod } from "@/lib/supabase/database.types";

/** Item categories (value used in DB/filters, label shown in UI). */
export const CATEGORIES = [
  { value: "bags", label: "Bags" },
  { value: "jewellery", label: "Jewellery" },
  { value: "watches", label: "Watches" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "apparel", label: "Apparel" },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

/**
 * Process distinction — single source of truth for the authenticate-vs-evaluate
 * trust model. Jewellery is *evaluated* (appraisal/valuation), everything else
 * is *authenticated*. Every buyer- and seller-facing surface (card/PDP badges,
 * sell-flow trust copy, category tiles) derives its label from these helpers so
 * the distinction stays consistent everywhere.
 */
export type ItemProcess = "authenticated" | "evaluated";

const EVALUATED_CATEGORIES = new Set<string>(["jewellery"]);

/** Which guarantee a category falls under: 'authenticated' | 'evaluated'. */
export function categoryProcess(category: string): ItemProcess {
  return EVALUATED_CATEGORIES.has(category) ? "evaluated" : "authenticated";
}

/** Badge/trust label for a category: 'Authenticated' | 'Evaluated'. */
export function processBadgeLabel(category: string): "Authenticated" | "Evaluated" {
  return categoryProcess(category) === "evaluated" ? "Evaluated" : "Authenticated";
}

/** Trust-copy verb for a category: 'evaluated'/'appraised' vs 'authenticated'. */
export function processVerb(category: string): string {
  return categoryProcess(category) === "evaluated" ? "appraised" : "authenticated";
}

/** Trust-copy noun for a category: 'appraisal' vs 'authentication'. */
export function processNoun(category: string): string {
  return categoryProcess(category) === "evaluated" ? "appraisal" : "authentication";
}

/** Condition grades (from the demo). */
export const CONDITIONS = ["Pristine", "Mint", "Excellent", "Good"] as const;

/**
 * House definitions for each condition grade. Single source of truth for the
 * how-it-works condition guide and the on-listing condition tooltip — order
 * mirrors {@link CONDITIONS} (best to most-worn). Kept concise and on-brand:
 * factual, unhurried, no superlatives beyond the grade itself.
 */
export const CONDITION_DEFINITIONS: { grade: string; definition: string }[] = [
  {
    grade: "Pristine",
    definition:
      "Unworn and as it left the maison. No marks, no signs of handling — often still with its original packaging and papers.",
  },
  {
    grade: "Mint",
    definition:
      "Worn only a handful of times, if at all. Immaculate to the eye with no visible flaws; indistinguishable from new in normal wear.",
  },
  {
    grade: "Excellent",
    definition:
      "Gently used and carefully kept. Only the faintest signs of wear on close inspection, with structure and finish fully intact.",
  },
  {
    grade: "Good",
    definition:
      "Loved and lived in. Honest, visible signs of wear consistent with regular use, while remaining sound and fully wearable.",
  },
];

/**
 * Plan-facing alias for {@link CONDITION_DEFINITIONS}. Downstream lanes import
 * the guide under this name; both point at the same single source of truth.
 */
export const CONDITION_GUIDE = CONDITION_DEFINITIONS;

/** Authentication pathways. */
export const AUTH_METHODS: {
  value: AuthMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "photo",
    label: "Photo Review",
    description:
      "Upload high-resolution photos. Our authentication team reviews them remotely — fastest route to listing.",
  },
  {
    value: "courier",
    label: "Courier to D&D",
    description:
      "We arrange insured collection of your piece for hands-on inspection at our depot.",
  },
  {
    value: "dropoff",
    label: "Drop-off at Depot",
    description:
      "Bring your piece to a D&D depot in person for immediate hands-on authentication.",
  },
];

export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  photo: "Photo Review",
  courier: "Courier to D&D",
  dropoff: "Drop-off at Depot",
};

/** Common maisons — used in submission hints and browse filters. */
export const BRANDS = [
  "Hermès",
  "Chanel",
  "Louis Vuitton",
  "Rolex",
  "Cartier",
  "Dior",
  "Audemars Piguet",
  "Gucci",
  "Bottega Veneta",
  "Prada",
  "Patek Philippe",
  "Bvlgari",
] as const;

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Listing titles often already start with the brand ("Prada Monolith Loafer");
// only prepend it when missing. Strip diacritics so "Hermès" matches "Hermes".
const fold = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function brandedTitle({
  brand,
  title,
}: {
  brand: string;
  title: string;
}): string {
  return fold(title).startsWith(fold(brand)) ? title : `${brand} ${title}`;
}

/** South African provinces — delivery address (checkout). */
export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;
