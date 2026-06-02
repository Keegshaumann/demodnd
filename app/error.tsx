"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="mb-6 font-serif text-[20px] uppercase tracking-[0.16em] text-gold">
        D&amp;D Luxury
      </div>
      <p className="eyebrow mb-4">Something went wrong</p>
      <h1 className="mb-4 font-serif" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
        A momentary lapse in service.
      </h1>
      <p className="mb-8 max-w-[440px] text-[15px] text-ink-muted">
        Our apologies — something didn&apos;t load as it should. Please try again,
        or return to the collection.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Return home
        </Link>
      </div>
    </div>
  );
}
