"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { estimateValue, type Valuation } from "./estimate";

/**
 * Server action backing the sell wizard's "Estimate a fair price" button.
 * Guarded to signed-in users; the wizard itself is verified-seller only.
 */
export type EstimateActionResult =
  | { ok: true; valuation: Valuation }
  | { ok: false; error: string };

const schema = z.object({
  brand: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(40),
  model: z.string().trim().max(160).optional(),
  condition: z.string().trim().min(1).max(40),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
});

export async function estimatePriceAction(
  input: unknown,
): Promise<EstimateActionResult> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Add the brand, category and condition first." };
  }
  const res = await estimateValue(parsed.data);
  if (!res.ok) return { ok: false, error: res.reason };
  return { ok: true, valuation: res.valuation };
}
