import Link from "next/link";

/**
 * Not-found boundary for the marketplace route group. Without this, a
 * `notFound()` from a marketplace page (e.g. a junk/missing listing id) falls
 * through to the root `app/not-found.tsx`, which doesn't compose with this
 * group's layout and renders an empty <main>. Colocating the boundary here
 * renders the "retired" UI inside the marketplace chrome (header/footer).
 */
export default function MarketplaceNotFound() {
  return (
    <div className="dnd-container flex flex-col items-center justify-center py-28 text-center sm:py-36">
      <p className="eyebrow mb-4">404</p>
      <h1 className="mb-4 font-serif" style={{ fontSize: "clamp(32px,5vw,56px)" }}>
        This page has been retired.
      </h1>
      <p className="mb-8 max-w-[440px] text-[15px] text-ink-muted">
        The piece you&apos;re looking for may have sold, been delisted, or never
        existed. The collection, however, is always open.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/browse" className="btn btn-primary">
          Browse the collection
        </Link>
        <Link href="/" className="btn btn-outline">
          Return home
        </Link>
      </div>
    </div>
  );
}
