"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addWishlistAction,
  removeWishlistAction,
} from "@/lib/buyer/actions";
import { CATEGORIES, categoryLabel } from "@/lib/marketplace/constants";
import { formatZar } from "@/lib/money";
import { CloseIcon, HeartIcon } from "@/components/ui/icons";
import type { Wishlist } from "@/lib/supabase/database.types";

export function WishlistManager({ initial }: { initial: Wishlist[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addWishlistAction({
        brand,
        category,
        keywords,
        maxPriceRands: maxPrice ? Number(maxPrice) : null,
      });
      if (!res.ok) setError(res.error);
      else {
        setBrand("");
        setCategory("");
        setKeywords("");
        setMaxPrice("");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await removeWishlistAction(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
      {/* Add form */}
      <form onSubmit={add} className="surface-card h-fit p-6">
        <h2 className="mb-1 font-serif text-xl">Add a wish</h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          We&apos;ll email you the moment a matching authenticated piece is
          listed.
        </p>
        <div className="space-y-4">
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
              <option value="">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Keywords</span>
            <input
              className="field-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Birkin 30 gold"
            />
          </label>
          <label className="block">
            <span className="field-label">Max price (R)</span>
            <input
              type="number"
              className="field-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="No limit"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-[13px] text-[#e85d5d]">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block mt-5"
        >
          {pending ? "Saving…" : "Add to wishlist"}
        </button>
      </form>

      {/* List */}
      <div>
        {initial.length === 0 ? (
          <div className="surface-card flex flex-col items-center p-16 text-center text-ink-muted">
            <HeartIcon width={28} height={28} className="mb-3 text-ink-dim" />
            Your wishlist is empty. Add what you&apos;re hunting for and we&apos;ll
            alert you when it arrives.
          </div>
        ) : (
          <ul className="space-y-3">
            {initial.map((w) => (
              <li
                key={w.id}
                className="surface-card flex items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <div className="font-serif text-lg">
                    {w.brand ?? "Any brand"}
                    {w.category && (
                      <span className="text-ink-muted">
                        {" "}
                        · {categoryLabel(w.category)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-muted">
                    {w.keywords && <span>“{w.keywords}” </span>}
                    {w.max_price_cents && (
                      <span>· under {formatZar(w.max_price_cents)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  disabled={pending}
                  aria-label="Remove from wishlist"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border text-ink-dim transition-colors hover:border-gold hover:text-gold"
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
