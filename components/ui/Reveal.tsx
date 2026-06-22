"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
} from "react";

// useLayoutEffect on the client (runs before paint → no flash), useEffect on
// the server (avoids the SSR warning). Standard isomorphic pattern.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Scroll-reveal that ENHANCES an already-visible default. Children render
 * visible (SSR, no-JS, crawlers, headless). On mount we measure: if the element
 * starts below the fold we hide it (before paint) and reveal it on scroll;
 * above-the-fold content is never gated. Honours prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  // Start hidden=false so the very first (SSR/no-JS) render is visible.
  const [hidden, setHidden] = useState(false);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave visible, no motion

    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.88;
    if (!belowFold) return; // above the fold → don't gate, no animation needed

    // Below the fold: hide now (pre-paint), then reveal when it scrolls in.
    setHidden(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHidden(false);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);

    // Failsafe: never let content stay hidden indefinitely (e.g. an observer
    // that never fires in a background tab that later becomes visible).
    const failsafe = window.setTimeout(() => setHidden(false), 2600);
    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${hidden ? "reveal-hidden" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
