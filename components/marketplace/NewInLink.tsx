import Link from "next/link";
import { ClockIcon, ArrowRightIcon } from "@/components/ui/icons";

/**
 * Prominent "New In" entry point for the browse header band (feature 13). Links
 * into the existing newest-first sort (`/browse?sort=newest`) so the new-arrivals
 * view reuses the established grid + pagination — no separate route needed.
 *
 * A quiet monochrome pill-style affordance: it reads as a deliberate shortcut,
 * not a filter chip, and sits alongside the result count. Plain server component
 * (no client state). 390px-safe — it shrinks to the icon + label and never
 * forces the header row to overflow.
 */
export function NewInLink() {
  return (
    <Link
      href="/browse?sort=newest"
      className="group inline-flex shrink-0 items-center gap-2 rounded-[3px] border border-border px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-300 ease-out-soft hover:border-ink hover:bg-deep"
    >
      <ClockIcon
        width={13}
        height={13}
        className="text-ink-dim transition-colors duration-300 group-hover:text-ink"
      />
      New in
      <ArrowRightIcon
        width={13}
        height={13}
        className="-ml-0.5 translate-x-0 text-ink-dim transition-[transform,color] duration-300 ease-out-soft group-hover:translate-x-0.5 group-hover:text-ink"
      />
    </Link>
  );
}
