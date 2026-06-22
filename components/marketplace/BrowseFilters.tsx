"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  CONDITIONS,
  AUTH_METHODS,
  AUTH_METHOD_LABELS,
  BRANDS,
  categoryLabel,
} from "@/lib/marketplace/constants";
import type { AuthMethod } from "@/lib/supabase/database.types";
import { SlidersIcon, CloseIcon, ChevronDownIcon } from "@/components/ui/icons";

/* ---------------------------------------------------------------------------
   Shared filter logic — a tiny hook so the desktop sidebar, the mobile drawer,
   and the active-filter chip row all mutate the same URL state.

   useSearchParams only reflects a router.push after the RSC navigation
   commits, so two interactions inside that window (e.g. a price-input blur
   followed by a checkbox click in the same gesture) would each build from the
   stale params and clobber the other. We track the in-flight query string at
   module level so every mutation builds on the latest push instead.
--------------------------------------------------------------------------- */
let pendingSearch: string | null = null;
const pushedSearches = new Set<string>();

function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const committed = searchParams.toString();
    // Clear the pending state once our latest push commits — or when an
    // external navigation (e.g. back button) supersedes our pushes.
    if (committed === pendingSearch || !pushedSearches.has(committed)) {
      pendingSearch = null;
      pushedSearches.clear();
    }
  }, [searchParams]);

  /** Latest params, including pushes that haven't committed to the URL yet. */
  function currentParams() {
    return new URLSearchParams(pendingSearch ?? searchParams.toString());
  }

  function pushParams(next: URLSearchParams) {
    const qs = next.toString();
    pendingSearch = qs;
    pushedSearches.add(qs);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(key: string, value: string) {
    const next = currentParams();
    const existing = next.getAll(key);
    next.delete(key);
    if (existing.includes(value)) {
      existing.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      [...existing, value].forEach((v) => next.append(key, v));
    }
    next.delete("page");
    pushParams(next);
  }

  function removeOne(key: string, value: string) {
    const next = currentParams();
    if (key === "min" || key === "max") next.delete(key);
    else {
      const kept = next.getAll(key).filter((v) => v !== value);
      next.delete(key);
      kept.forEach((v) => next.append(key, v));
    }
    next.delete("page");
    pushParams(next);
  }

  function clearAll() {
    const next = new URLSearchParams();
    const q = currentParams().get("q");
    if (q) next.set("q", q);
    pushParams(next);
  }

  const checked = (key: string, value: string) =>
    searchParams.getAll(key).includes(value);

  return {
    searchParams,
    currentParams,
    pushParams,
    toggle,
    removeOne,
    clearAll,
    checked,
  };
}

function countActive(searchParams: URLSearchParams): number {
  let n = 0;
  for (const k of ["category", "brand", "condition", "method"])
    n += searchParams.getAll(k).length;
  if (searchParams.get("min")) n += 1;
  if (searchParams.get("max")) n += 1;
  return n;
}

/* ---------------------------------------------------------------------------
   The filter panel itself — reused inside both the desktop aside and the drawer.
--------------------------------------------------------------------------- */
function FilterPanel() {
  const { searchParams, currentParams, pushParams, toggle, clearAll, checked } =
    useFilters();
  const [minR, setMinR] = useState(searchParams.get("min") ?? "");
  const [maxR, setMaxR] = useState(searchParams.get("max") ?? "");

  useEffect(() => {
    setMinR(searchParams.get("min") ?? "");
    setMaxR(searchParams.get("max") ?? "");
  }, [searchParams]);

  function applyPrice() {
    const next = currentParams();
    next.delete("min");
    next.delete("max");
    if (minR) next.set("min", minR);
    if (maxR) next.set("max", maxR);
    next.delete("page");
    pushParams(next);
  }

  const active = countActive(searchParams);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <span className="caption text-gold">
          Refine{active > 0 ? ` · ${active}` : ""}
        </span>
        {active > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] uppercase tracking-[0.16em] text-ink-muted underline-offset-2 hover:text-gold hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Category" defaultOpen>
        {CATEGORIES.map((c) => (
          <CheckRow
            key={c.value}
            label={c.label}
            checked={checked("category", c.value)}
            onChange={() => toggle("category", c.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Purchase price (R)" defaultOpen>
        <div className="mt-1 flex gap-2.5">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
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
            aria-label="Maximum price"
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

      <FilterGroup
        title="Condition"
        titleAffordance={
          <Link
            href="/how-it-works#condition-guide"
            aria-label="What do the condition grades mean?"
            title="What the grades mean"
            className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border border-border text-ink-dim transition-colors hover:border-gold hover:text-gold"
          >
            <InfoGlyph />
          </Link>
        }
      >
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
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Horizontal filter bar (rebag-style) — a row of dropdown facets above the
   results grid, shown on lg+. Below lg the BrowseFilterDrawer "Refine" trigger
   is used instead. Every facet mutates URL state through the SAME useFilters()
   hook (pendingSearch/pushParams) — never a fresh URLSearchParams — so rapid
   selections compose correctly (the stale-params race fix stays load-bearing).
--------------------------------------------------------------------------- */

/** A single dropdown facet — a trigger button + an anchored popover panel.
 *  Right-aligns/constrains its panel so a long option list scrolls inside the
 *  popover instead of pushing page width (no horizontal overflow). */
function FacetDropdown({
  label,
  count,
  children,
  align = "left",
}: {
  label: string;
  count: number;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape so dropdowns behave like a real menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-2 rounded-[3px] border bg-card px-3.5 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-gold ${
          count > 0 ? "border-gold" : "border-border"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
            {count}
          </span>
        )}
        <ChevronDownIcon
          width={14}
          height={14}
          className={`text-ink-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`absolute top-[calc(100%+8px)] z-[60] max-h-[60vh] w-[240px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[3px] border border-border bg-card p-4 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The price min/max popover — its own local input state mirrors the sidebar's,
 *  but commits through the shared useFilters() hook (applyPrice). */
function PriceFacet({ align = "left" }: { align?: "left" | "right" }) {
  const { searchParams, currentParams, pushParams } = useFilters();
  const [minR, setMinR] = useState(searchParams.get("min") ?? "");
  const [maxR, setMaxR] = useState(searchParams.get("max") ?? "");

  useEffect(() => {
    setMinR(searchParams.get("min") ?? "");
    setMaxR(searchParams.get("max") ?? "");
  }, [searchParams]);

  function applyPrice() {
    const next = currentParams();
    next.delete("min");
    next.delete("max");
    if (minR) next.set("min", minR);
    if (maxR) next.set("max", maxR);
    next.delete("page");
    pushParams(next);
  }

  const count = (searchParams.get("min") ? 1 : 0) + (searchParams.get("max") ? 1 : 0);

  return (
    <FacetDropdown label="Price" count={count} align={align}>
      <span className="caption mb-3 block text-gold">Purchase price (R)</span>
      <div className="flex gap-2.5">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          aria-label="Minimum price"
          value={minR}
          onChange={(e) => setMinR(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => e.key === "Enter" && applyPrice()}
          className="w-full min-w-0 rounded-[3px] border border-border bg-bg px-3 py-2 text-[13px] outline-none focus:border-gold"
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Max"
          aria-label="Maximum price"
          value={maxR}
          onChange={(e) => setMaxR(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => e.key === "Enter" && applyPrice()}
          className="w-full min-w-0 rounded-[3px] border border-border bg-bg px-3 py-2 text-[13px] outline-none focus:border-gold"
        />
      </div>
      <button
        type="button"
        onClick={applyPrice}
        className="btn btn-outline btn-sm btn-block mt-3"
      >
        Apply
      </button>
    </FacetDropdown>
  );
}

/** Desktop horizontal filter bar (hidden below lg — mobile uses the drawer).
 *  Each dropdown reuses the same CheckRow list + useFilters() mutators as the
 *  sidebar/drawer panel, so all filter logic and URL behaviour is identical. */
export function BrowseFilterBar() {
  const { searchParams, toggle, checked } = useFilters();

  const catCount = searchParams.getAll("category").length;
  const brandCount = searchParams.getAll("brand").length;
  const condCount = searchParams.getAll("condition").length;
  const methodCount = searchParams.getAll("method").length;

  return (
    <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
      <FacetDropdown label="Category" count={catCount}>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => (
            <CheckRow
              key={c.value}
              label={c.label}
              checked={checked("category", c.value)}
              onChange={() => toggle("category", c.value)}
            />
          ))}
        </div>
      </FacetDropdown>

      <FacetDropdown label="Maison" count={brandCount}>
        <div className="flex flex-col gap-3">
          {BRANDS.map((b) => (
            <CheckRow
              key={b}
              label={b}
              checked={checked("brand", b)}
              onChange={() => toggle("brand", b)}
            />
          ))}
        </div>
      </FacetDropdown>

      <PriceFacet />

      <FacetDropdown label="Condition" count={condCount}>
        <div className="mb-3 flex items-center justify-between">
          <span className="caption text-gold">Condition</span>
          <Link
            href="/how-it-works#condition-guide"
            aria-label="What do the condition grades mean?"
            title="What the grades mean"
            className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border border-border text-ink-dim transition-colors hover:border-gold hover:text-gold"
          >
            <InfoGlyph />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {CONDITIONS.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={checked("condition", c)}
              onChange={() => toggle("condition", c)}
            />
          ))}
        </div>
      </FacetDropdown>

      <FacetDropdown label="Authentication" count={methodCount} align="right">
        <div className="flex flex-col gap-3">
          {AUTH_METHODS.map((m) => (
            <CheckRow
              key={m.value}
              label={m.label}
              checked={checked("method", m.value)}
              onChange={() => toggle("method", m.value)}
            />
          ))}
        </div>
      </FacetDropdown>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Mobile drawer — a "Refine" trigger + slide-in sheet. Shown only below lg.
--------------------------------------------------------------------------- */
export function BrowseFilterDrawer() {
  const { searchParams } = useFilters();
  const [open, setOpen] = useState(false);
  const active = countActive(searchParams);

  // Lock body scroll while the sheet is open; close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-gold"
      >
        <SlidersIcon width={15} height={15} />
        Refine
        {active > 0 && (
          <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
            {active}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-[140] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Sheet — the clipping wrapper keeps the off-screen sheet from widening
          the page (horizontal overflow) while it sits closed. */}
      <div className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Refine results"
          className={`pointer-events-auto absolute inset-y-0 right-0 flex w-[88%] max-w-[380px] flex-col bg-bg shadow-xl transition-transform duration-[380ms] ease-out-soft ${
            open ? "translate-x-0" : "translate-x-full"
          } motion-reduce:transition-none`}
        >
          <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
            <span className="font-serif text-xl">Refine</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="rounded-[3px] border border-border p-2 text-ink transition-colors hover:border-gold"
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <FilterPanel />
          </div>
          <div className="border-t border-border-soft p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-primary btn-block"
            >
              View results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Active-filter chips — removable, sit above the grid.
--------------------------------------------------------------------------- */
export function ActiveFilterChips() {
  const { searchParams, removeOne, clearAll } = useFilters();

  const chips: { key: string; value: string; label: string }[] = [];
  searchParams.getAll("category").forEach((v) =>
    chips.push({ key: "category", value: v, label: categoryLabel(v) }),
  );
  searchParams.getAll("brand").forEach((v) =>
    chips.push({ key: "brand", value: v, label: v }),
  );
  searchParams.getAll("condition").forEach((v) =>
    chips.push({ key: "condition", value: v, label: v }),
  );
  searchParams.getAll("method").forEach((v) =>
    chips.push({
      key: "method",
      value: v,
      label: AUTH_METHOD_LABELS[v as AuthMethod] ?? v,
    }),
  );
  const min = searchParams.get("min");
  const max = searchParams.get("max");
  if (min) chips.push({ key: "min", value: min, label: `From R${min}` });
  if (max) chips.push({ key: "max", value: max, label: `Up to R${max}` });

  if (chips.length === 0) return null;

  return (
    <div className="mb-7 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          onClick={() => removeOne(c.key, c.value)}
          className="chip"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <span className="chip-x" aria-hidden>
            <CloseIcon width={11} height={11} />
          </span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-1 text-[11px] uppercase tracking-[0.16em] text-ink-muted underline-offset-2 hover:text-gold hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Collapsible group + check row.
--------------------------------------------------------------------------- */
function FilterGroup({
  title,
  children,
  defaultOpen = false,
  titleAffordance,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Optional control rendered beside the group title (e.g. the condition-guide
   *  info link). Kept a sibling of the collapse toggle — never nested inside it —
   *  so clicking it doesn't expand/collapse the group (and stays valid HTML). */
  titleAffordance?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-soft py-5 first:pt-0 last:border-b-0">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-gold">
            {title}
          </span>
          <ChevronDownIcon
            width={15}
            height={15}
            className={`text-ink-dim transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {titleAffordance && (
          <span className="ml-2.5 flex-shrink-0">{titleAffordance}</span>
        )}
      </div>
      {open && <div className="mt-4 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

/** Tiny "i" info glyph for the condition-guide anchor (no icon-set dependency —
 *  this file's lane doesn't own components/ui/icons.tsx). */
function InfoGlyph() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v5" />
      <path d="M12 7.6h.01" />
    </svg>
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
