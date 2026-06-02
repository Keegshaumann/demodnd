import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="mb-6 font-serif text-[20px] uppercase tracking-[0.16em] text-gold">
        D&amp;D Luxury
      </div>
      <p className="eyebrow mb-4">404</p>
      <h1 className="mb-4 font-serif" style={{ fontSize: "clamp(32px,5vw,56px)" }}>
        This page has been retired.
      </h1>
      <p className="mb-8 max-w-[440px] text-[15px] text-ink-muted">
        The piece you&apos;re looking for may have sold, been delisted, or never
        existed. The collection, however, is always open.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Return home
        </Link>
        <Link href="/browse" className="btn btn-outline">
          Browse the collection
        </Link>
      </div>
    </div>
  );
}
