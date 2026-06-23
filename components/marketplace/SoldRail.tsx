import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { getRecentlySold } from "@/lib/marketplace/social";

/**
 * RECENTLY SOLD rail (feature 6) — quiet social proof that pieces move.
 *
 * An async server component that fetches sold pieces (newest first) via
 * getRecentlySold (lane B). Sold cards already carry the dimmed "Sold" treatment
 * from <ListingCard>, so this rail is just a titled, non-interactive showcase —
 * the cards still link to the (now-sold) detail pages for provenance, exactly
 * like the existing "similar" rails.
 *
 * Renders nothing when there are no sold pieces, so the homepage stays clean on
 * a fresh catalogue. Sold cards are public, so no saved-state hydration is
 * needed (a buyer can't favourite a sold piece from here meaningfully); the
 * FavouriteButton defaults to un-saved, which is correct for sold stock.
 */
export async function SoldRail({ limit = 8 }: { limit?: number }) {
  const sold = await getRecentlySold(limit);
  if (sold.length === 0) return null;

  return (
    <section className="border-t border-border-soft bg-surface" style={{ padding: "72px 0 80px" }}>
      <div className="dnd-container">
        <div className="mb-9">
          <div className="eyebrow mb-3">Just sold</div>
          <h2 className="font-serif" style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>
            Recently sold.
          </h2>
          <p className="mt-3 max-w-[520px] text-pretty text-[14px] leading-relaxed text-ink-muted">
            Pieces that found a new home this season — a sense of what moves, and
            how quickly.
          </p>
        </div>

        {/* Same responsive scroll-snap ladder as the other rails — 390px-safe. */}
        <div className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-7 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-7 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {sold.map((l, i) => (
            <Reveal
              key={l.id}
              delay={Math.min(i, 3) * 60}
              className="min-w-0 shrink-0 basis-[82%] snap-start sm:basis-auto"
            >
              <ListingCard listing={l} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
