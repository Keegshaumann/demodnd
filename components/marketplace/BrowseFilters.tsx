"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import {
  CATEGORIES,
  CONDITIONS,
  AUTH_METHODS,
  BRANDS,
} from "@/lib/marketplace/constants";

export function BrowseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minR, setMinR] = useState(searchParams.get("min") ?? "");
  const [maxR, setMaxR] = useState(searchParams.get("max") ?? "");

  function pushParams(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const existing = next.getAll(key);
    next.delete(key);
    if (existing.includes(value)) {
      existing.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      [...existing, value].forEach((v) => next.append(key, v));
    }
    pushParams(next);
  }

  function applyPrice() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("min");
    next.delete("max");
    if (minR) next.set("min", minR);
    if (maxR) next.set("max", maxR);
    pushParams(next);
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    setMinR("");
    setMaxR("");
    pushParams(next);
  }

  const checked = (key: string, value: string) =>
    searchParams.getAll(key).includes(value);

  const hasFilters =
    ["category", "brand", "condition", "method"].some(
      (k) => searchParams.getAll(k).length > 0,
    ) ||
    !!searchParams.get("min") ||
    !!searchParams.get("max");

  return (
    <aside className="lg:sticky lg:top-24">
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="mb-6 text-[11px] uppercase tracking-[0.18em] text-ink-muted underline hover:text-gold"
        >
          Clear all filters
        </button>
      )}

      <FilterGroup title="Category">
        {CATEGORIES.map((c) => (
          <CheckRow
            key={c.value}
            label={c.label}
            checked={checked("category", c.value)}
            onChange={() => toggle("category", c.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Purchase price (R)">
        <div className="mt-3 flex gap-2.5">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={minR}
            onChange={(e) => setMinR(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            className="w-full min-w-0 rounded-[3px] border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none focus:border-gold"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={maxR}
            onChange={(e) => setMaxR(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            className="w-full min-w-0 rounded-[3px] border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none focus:border-gold"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Maison">
        {BRANDS.map((b) => (
          <CheckRow
            key={b}
            label={b}
            checked={checked("brand", b)}
            onChange={() => toggle("brand", b)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Condition">
        {CONDITIONS.map((c) => (
          <CheckRow
            key={c}
            label={c}
            checked={checked("condition", c)}
            onChange={() => toggle("condition", c)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Authentication">
        {AUTH_METHODS.map((m) => (
          <CheckRow
            key={m.value}
            label={m.label}
            checked={checked("method", m.value)}
            onChange={() => toggle("method", m.value)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-9 border-b border-border-soft pb-[30px] last:border-b-0">
      <h4 className="mb-[22px] text-[11px] font-medium uppercase tracking-[0.24em] text-gold">
        {title}
      </h4>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] text-ink-muted transition-colors hover:text-ink">
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[2px] border text-[10px] font-bold text-white transition-all ${
          checked ? "border-gold bg-gold" : "border-border bg-card"
        }`}
      >
        {checked && "✓"}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
