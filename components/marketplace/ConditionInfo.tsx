"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CONDITION_GUIDE } from "@/lib/marketplace/constants";

/**
 * Small "i" affordance shown beside a listing's condition grade. Hovering or
 * focusing reveals the house definition for that grade (from CONDITION_GUIDE);
 * the control is a link to the full condition guide on /how-it-works, so it
 * stays useful with JS disabled and for keyboard/touch users who can't hover.
 *
 * The anchor target (#condition-guide) is rendered by the how-it-works page
 * (ui-browse-guide lane) — both sides agree on that id.
 */
export function ConditionInfo({ grade }: { grade: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  // Match the grade to its definition (case-insensitive). If it's an unknown
  // grade, fall back to a neutral pointer to the guide rather than a blank box.
  const entry = CONDITION_GUIDE.find(
    (c) => c.grade.toLowerCase() === grade.toLowerCase(),
  );
  const definition =
    entry?.definition ?? "See how we grade every piece's condition.";

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/how-it-works#condition-guide"
        aria-label={`What does "${grade}" condition mean?`}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border text-[10px] font-medium leading-none text-ink-dim transition-colors duration-200 ease-out-soft hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink"
      >
        <span aria-hidden>i</span>
      </Link>

      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute left-1/2 top-full z-20 mt-2 w-[clamp(220px,68vw,280px)] -translate-x-1/2 rounded-[3px] border border-border-soft bg-card p-3.5 text-left shadow-xl"
        >
          <span className="mb-1 block text-[10.5px] font-medium uppercase tracking-[0.16em] text-gold">
            {entry?.grade ?? grade}
          </span>
          <span className="block text-[12.5px] leading-relaxed text-ink-muted">
            {definition}
          </span>
        </span>
      )}
    </span>
  );
}
