"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const KEY = "dnd-cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // localStorage unavailable — don't block the page.
    }
  }, []);

  // Publish the banner's height as a CSS variable so other bottom-anchored
  // bars (e.g. the mobile buy bar) can offset themselves above it instead of
  // being covered until consent is given.
  useEffect(() => {
    const el = ref.current;
    if (!show || !el) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--cookie-banner-h", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--cookie-banner-h");
    };
  }, [show]);

  function decide(value: "accepted" | "essential") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    // z-[130]: above the mobile buy bar (z-[120]) but below the filter
    // drawer's backdrop/sheet (z-[140]/z-[150]) so open drawers stay on top.
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[130] border-t border-border bg-surface/95 backdrop-blur-md"
    >
      <div className="dnd-container flex flex-col items-start gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          We use essential cookies to keep you signed in and run the marketplace
          securely. See our{" "}
          <Link href="/privacy" className="text-gold underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("essential")}
            className="btn btn-outline btn-sm"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="btn btn-primary btn-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
