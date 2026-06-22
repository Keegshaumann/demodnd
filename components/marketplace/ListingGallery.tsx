"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CertificateIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
} from "@/components/ui/icons";

// Below this horizontal travel a touch is treated as a tap (open / no-op),
// not a swipe. Keeps click-to-open from being eaten by tiny finger jitter.
const SWIPE_THRESHOLD = 48;

export function ListingGallery({
  images,
  alt,
  badge = "Authenticated",
}: {
  images: string[];
  alt: string;
  /** Process-aware trust badge ("Authenticated" | "Evaluated"). */
  badge?: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const main = images[active];

  const has = images.length > 0;
  const multi = images.length > 1;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!multi) return;
      setZoomed(false);
      setActive((i) => (i + dir + images.length) % images.length);
    },
    [multi, images.length],
  );

  const open = useCallback(() => {
    if (!has) return;
    setZoomed(false);
    setLightbox(true);
  }, [has]);

  const close = useCallback(() => {
    setLightbox(false);
    setZoomed(false);
  }, []);

  // ----- Lightbox lifecycle: lock body scroll, keyboard nav, focus restore.
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreTo = triggerRef.current;
    // Move focus into the overlay so Escape/arrows are caught and the
    // background isn't keyboard-reachable.
    overlayRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // Return focus to the image the user opened from.
      restoreTo?.focus();
    };
  }, [lightbox, close, go]);

  // ----- Touch swipe (used by both the resting main image and the lightbox).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent, onTap?: () => void) => {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Horizontal-dominant gesture past the threshold → navigate.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    // Otherwise it's a tap.
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) onTap?.();
  };

  return (
    <div>
      {/* Resting main image — click (or tap) to open the lightbox; keeps the
          hover-zoom rest behaviour. */}
      <div className="group relative mb-4 aspect-[4/5] overflow-hidden rounded-[3px] border border-border-soft bg-card">
        {main ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={open}
            onTouchStart={onTouchStart}
            onTouchEnd={(e) => onTouchEnd(e, open)}
            aria-label="Open full-screen view"
            className="block h-full w-full cursor-zoom-in"
          >
            <Image
              src={main}
              alt={alt}
              width={1000}
              height={1250}
              priority
              className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04] motion-reduce:transition-none"
            />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={48} height={48} />
          </div>
        )}
        <span className="pill pill-glass pointer-events-none absolute left-4 top-4 z-[2]">
          <CertificateIcon width={11} height={11} /> {badge}
        </span>
      </div>
      {multi && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`aspect-square overflow-hidden rounded-[3px] border bg-card transition-all duration-300 motion-reduce:transition-none ${
                i === active
                  ? "border-gold ring-1 ring-gold"
                  : "border-border-soft opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt={`${alt} view ${i + 1}`}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen lightbox overlay. */}
      {lightbox && main && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} — full-screen gallery`}
          tabIndex={-1}
          className="fixed inset-0 z-[200] flex flex-col bg-black/95 outline-none backdrop-blur-sm"
        >
          {/* Top bar: counter + zoom + close. */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 text-white sm:px-8">
            <span className="text-[12px] uppercase tracking-[0.18em] text-white/70 tabular-nums">
              {multi ? `${active + 1} / ${images.length}` : "Full view"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? "Zoom out" : "Zoom in"}
                aria-pressed={zoomed}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/60 motion-reduce:transition-none"
              >
                {zoomed ? (
                  <MinusIcon width={18} height={18} />
                ) : (
                  <PlusIcon width={18} height={18} />
                )}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close full-screen view"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/60 motion-reduce:transition-none"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>
          </div>

          {/* Stage. Click empty area to close; click image to toggle zoom. */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 sm:px-16"
            onClick={close}
            onTouchStart={onTouchStart}
            onTouchEnd={(e) => onTouchEnd(e)}
          >
            {multi && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous image"
                className="absolute left-3 z-[2] inline-flex h-11 w-11 -scale-x-100 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition-colors hover:border-white/60 sm:left-6 motion-reduce:transition-none"
              >
                <ChevronRightIcon width={20} height={20} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              className={`relative max-h-full max-w-full overflow-auto ${
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
            >
              <Image
                src={main}
                alt={alt}
                width={1600}
                height={2000}
                priority
                className={`max-h-[calc(100vh-160px)] w-auto origin-center object-contain transition-transform duration-300 ease-out-soft motion-reduce:transition-none ${
                  zoomed ? "scale-[1.8]" : "scale-100"
                }`}
              />
            </button>

            {multi && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next image"
                className="absolute right-3 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white transition-colors hover:border-white/60 sm:right-6 motion-reduce:transition-none"
              >
                <ChevronRightIcon width={20} height={20} />
              </button>
            )}
          </div>

          {/* Thumbnail strip inside the lightbox. */}
          {multi && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto px-5 py-4 sm:px-8">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => {
                    setZoomed(false);
                    setActive(i);
                  }}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === active}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-[3px] border transition-all duration-300 motion-reduce:transition-none ${
                    i === active
                      ? "border-white opacity-100"
                      : "border-white/20 opacity-50 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${alt} view ${i + 1}`}
                    width={120}
                    height={120}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
