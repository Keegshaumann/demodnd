"use client";

import { Children, useRef, type ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * One horizontal, scroll-snapping row of cards (Vestiaire-style) with arrow
 * controls on desktop and swipe on mobile — keeps each edit to a single tidy
 * line instead of a stacked grid. Children are server-rendered (e.g.
 * <ListingCard>) and passed in, so this stays a thin client scroller.
 */
export function Carousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-6 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:scroll-pl-0 sm:px-0"
      >
        {items.map((child, i) => (
          <div key={i} className="w-[80%] shrink-0 snap-start sm:w-[300px]">
            {child}
          </div>
        ))}
      </div>

      {/* Desktop scroll controls — swipe covers mobile, so these are lg-only. */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        className="absolute -left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-bg p-3 text-ink shadow-md transition-colors hover:border-gold lg:flex"
      >
        <ChevronRightIcon width={18} height={18} className="rotate-180" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        className="absolute -right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border bg-bg p-3 text-ink shadow-md transition-colors hover:border-gold lg:flex"
      >
        <ChevronRightIcon width={18} height={18} />
      </button>
    </div>
  );
}
