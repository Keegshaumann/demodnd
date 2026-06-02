import type { AuthMethod } from "@/lib/supabase/database.types";

/** Item categories (value used in DB/filters, label shown in UI). */
export const CATEGORIES = [
  { value: "bags", label: "Handbags" },
  { value: "watches", label: "Watches" },
  { value: "jewellery", label: "Jewellery" },
  { value: "shoes", label: "Shoes" },
  { value: "other", label: "Other" },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

/** Condition grades (from the demo). */
export const CONDITIONS = ["Pristine", "Mint", "Excellent", "Good"] as const;

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
