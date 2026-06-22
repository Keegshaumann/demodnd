import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { formatZar } from "@/lib/money";
import { categoryLabel } from "@/lib/marketplace/constants";
import { getBrandComps, type Comps } from "./comps";

/**
 * Seller price-range estimator — "AI estimate + your own comps".
 *
 * When ANTHROPIC_API_KEY is set, Claude (Haiku 4.5 by default — cheap, ~$0.0015
 * per call; override with ANTHROPIC_VALUATION_MODEL) returns a fair-market
 * low–high resale range for the specific item, grounded by a summary of
 * comparable pieces already on D&D. Without a key (or if the call fails) it
 * falls back to a range derived from the own-catalogue comps, and finally to an
 * "unavailable" state. Always an ESTIMATE, never a guarantee or a binding offer.
 */
export interface ValuationInput {
  brand: string;
  category: string;
  model?: string;
  condition: string;
  year?: number | null;
}

export type ValuationBasis = "ai+comps" | "ai" | "comps";

export interface Valuation {
  lowCents: number;
  highCents: number;
  rationale: string;
  confidence: "low" | "medium" | "high";
  basis: ValuationBasis;
}

export type ValuationResult =
  | { ok: true; valuation: Valuation }
  | { ok: false; reason: string };

const ESTIMATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lowRands: { type: "integer" },
    highRands: { type: "integer" },
    rationale: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["lowRands", "highRands", "rationale", "confidence"],
} as const;

function compsLine(comps: Comps | null): string {
  if (!comps) return "No directly comparable pieces are currently on D&D.";
  return `D&D currently has ${comps.count} comparable piece${
    comps.count === 1 ? "" : "s"
  } of this brand, priced from ${formatZar(comps.minCents)} to ${formatZar(
    comps.maxCents,
  )} (median ${formatZar(comps.medianCents)}).`;
}

async function aiEstimate(
  input: ValuationInput,
  comps: Comps | null,
): Promise<Valuation> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const details = [
    `Brand: ${input.brand}`,
    `Category: ${categoryLabel(input.category)}`,
    input.model ? `Model/name: ${input.model}` : null,
    `Condition: ${input.condition}`,
    input.year ? `Year: ${input.year}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: env.ANTHROPIC_VALUATION_MODEL,
    max_tokens: 600,
    system:
      "You are a pre-owned luxury resale pricing specialist for a South African marketplace (prices in ZAR). " +
      "Given an item's attributes and any comparable pieces already on the platform, return a realistic fair-market " +
      "SECONDHAND resale price RANGE (low to high) in whole Rands, plus a one-sentence rationale and a confidence level. " +
      "Anchor to the comparable pieces when they are relevant, and reflect how brand, model and condition move price. " +
      "This is a guidance estimate, not an appraisal or a guaranteed sale price. Keep the rationale under 240 characters.",
    messages: [
      {
        role: "user",
        content: `Estimate a fair resale price range for this piece.\n\n${details}\n\n${compsLine(
          comps,
        )}`,
      },
    ],
    // Structured output — guarantees a schema-valid JSON body we can parse.
    output_config: {
      format: { type: "json_schema", schema: ESTIMATE_SCHEMA },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "refusal") {
    throw new Error("valuation refused");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no valuation content");
  const parsed = JSON.parse(text.text) as {
    lowRands: number;
    highRands: number;
    rationale: string;
    confidence: "low" | "medium" | "high";
  };

  const lowCents = Math.round(Math.min(parsed.lowRands, parsed.highRands) * 100);
  const highCents = Math.round(Math.max(parsed.lowRands, parsed.highRands) * 100);
  return {
    lowCents,
    highCents,
    rationale: parsed.rationale.trim(),
    confidence: parsed.confidence,
    basis: comps ? "ai+comps" : "ai",
  };
}

export async function estimateValue(
  input: ValuationInput,
): Promise<ValuationResult> {
  const comps = await getBrandComps(input.brand, input.category);

  if (env.ANTHROPIC_API_KEY) {
    try {
      return { ok: true, valuation: await aiEstimate(input, comps) };
    } catch {
      // fall through to comps-only below
    }
  }

  // Fallback: derive a range straight from own-catalogue comps.
  if (comps && comps.count >= 2) {
    return {
      ok: true,
      valuation: {
        lowCents: comps.minCents,
        highCents: comps.maxCents,
        rationale: `Based on ${comps.count} similar ${input.brand} piece${
          comps.count === 1 ? "" : "s"
        } currently on D&D.`,
        confidence: comps.count >= 4 ? "medium" : "low",
        basis: "comps",
      },
    };
  }

  return {
    ok: false,
    reason: env.ANTHROPIC_API_KEY
      ? "We couldn't generate an estimate right now — price it from comparable pieces on D&D."
      : "Price estimates aren't switched on yet. Add an ANTHROPIC_API_KEY to enable them.",
  };
}
