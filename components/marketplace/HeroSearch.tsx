"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";

/** Hero search bar — routes to /browse?q=… Matches `.hero-search-bar`. */
export function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 flex w-full max-w-[900px] items-center overflow-hidden rounded-[3px] border border-border bg-surface shadow-sm transition-colors focus-within:border-gold"
    >
      <span className="flex-shrink-0 px-4 text-ink-dim">
        <SearchIcon width={18} height={18} />
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for Hermès, Rolex, Chanel, Cartier..."
        className="min-w-0 flex-1 bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-ink-dim"
      />
      <button
        type="submit"
        className="flex-shrink-0 whitespace-nowrap bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-gold-bright"
      >
        Search
      </button>
    </form>
  );
}
