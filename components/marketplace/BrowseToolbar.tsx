"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/ui/icons";

export function BrowseToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  // PUB-4: keep the input in sync with the URL on Back/Forward or an external
  // search push (the one-shot useState initializer doesn't re-run otherwise).
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  function update(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update((p) => {
            const v = q.trim();
            if (v) p.set("q", v);
            else p.delete("q");
          });
        }}
        className="hidden items-center gap-2 rounded-[3px] border border-border bg-card px-3.5 py-2 transition-colors focus-within:border-gold sm:flex"
      >
        <SearchIcon width={14} height={14} className="text-ink-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pieces..."
          aria-label="Search pieces"
          className="w-[180px] bg-transparent text-[13px] outline-none placeholder:text-ink-dim"
        />
      </form>

      <select
        value={searchParams.get("sort") ?? "featured"}
        onChange={(e) =>
          update((p) => {
            if (e.target.value === "featured") p.delete("sort");
            else p.set("sort", e.target.value);
          })
        }
        aria-label="Sort listings"
        className="field-input w-auto py-2.5 text-[13px]"
      >
        <option value="featured">Sort: Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </div>
  );
}
