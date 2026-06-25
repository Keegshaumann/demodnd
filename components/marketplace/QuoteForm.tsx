"use client";

import { useState } from "react";
import Link from "next/link";
import { publicQuoteAction, type EstimateActionResult } from "@/lib/valuation/actions";
import { CATEGORIES, CONDITIONS } from "@/lib/marketplace/constants";
import { formatZar } from "@/lib/money";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Public "what's it worth?" quote tool — the supply-side hook. Same AI+comps
 * engine as the seller wizard, but open to anyone (the action is rate-limited).
 * A non-binding guide that funnels into /sell.
 */
export function QuoteForm() {
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState<string>(CONDITIONS[0]);
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateActionResult | null>(null);

  const ready = Boolean(brand.trim() && category && condition);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setResult(null);
    setResult(
      await publicQuoteAction({
        brand: brand.trim(),
        category,
        model: model.trim() || undefined,
        condition,
        year: year ? Number(year) : null,
      }),
    );
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="surface-card p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Brand</span>
          <input
            className="field-input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Hermès"
          />
        </label>
        <label className="block">
          <span className="field-label">Category</span>
          <select
            className="field-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Choose category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Model / name (optional)</span>
          <input
            className="field-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Birkin 30"
          />
        </label>
        <label className="block">
          <span className="field-label">Condition</span>
          <select
            className="field-input"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Year (optional)</span>
          <input
            type="number"
            className="field-input"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2022"
            min={1900}
            max={new Date().getFullYear()}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!ready || loading}
        className="btn btn-primary btn-block mt-6"
      >
        {loading ? "Valuing…" : "Get my estimate"}
      </button>

      {result && !result.ok && (
        <p className="mt-4 text-[13px] text-ink-muted">{result.error}</p>
      )}
      {result && result.ok && (
        <div className="mt-6 rounded-[3px] border border-border-soft bg-bg px-5 py-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim">
            Estimated resale value
          </div>
          <div className="mt-1 font-serif text-[26px] text-ink">
            {formatZar(result.valuation.lowCents)} – {formatZar(result.valuation.highCents)}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            {result.valuation.rationale}
          </p>
          <Link href="/sell" className="btn btn-primary mt-4">
            Sell yours with D&D <ArrowRightIcon width={16} height={16} />
          </Link>
          <p className="mt-2 text-[11px] text-ink-dim">
            An estimate, not an offer — final value is set after authentication.
          </p>
        </div>
      )}
    </form>
  );
}
