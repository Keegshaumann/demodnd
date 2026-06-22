"use client";

import { useState } from "react";

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[760px] divide-y divide-border-soft border-y border-border-soft">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-4 py-5 text-left font-serif text-[19px] text-ink"
            >
              {item.q}
              <span
                className={`mt-0.5 flex-shrink-0 text-xl text-gold transition-transform ${isOpen ? "rotate-45" : ""}`}
                aria-hidden
              >
                +
              </span>
            </button>
            {isOpen && (
              <p className="animate-fadeIn pb-5 text-[14.5px] leading-relaxed text-ink-muted">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
