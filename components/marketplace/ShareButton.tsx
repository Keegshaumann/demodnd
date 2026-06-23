"use client";

import { useEffect, useState } from "react";

/**
 * Share controls for a listing (and reusable for any URL). No backend:
 *  - Copy link   → navigator.clipboard with a transient "Copied" state.
 *  - WhatsApp    → https://wa.me/?text=<encoded "title — url">.
 *  - Native share → navigator.share, shown ONLY when the API is present
 *    (feature-detected after mount to avoid an SSR/client hydration mismatch).
 *
 * Monochrome editorial: small ghost-ish buttons sitting under the price / buy
 * card. Fits 390px (the row wraps).
 */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Feature-detect after mount so the server and first client render agree
  // (navigator is undefined on the server).
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const shareText = `${title} — ${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copyLink() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can reject (permissions / insecure context); fail quietly.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // User dismissed the sheet or share failed — nothing to surface.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-dim">
        Share
      </span>

      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Link copied" : "Copy link"}
        className="inline-flex items-center gap-1.5 rounded-[3px] border border-border px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors ease-out-soft hover:border-gold hover:text-gold"
      >
        <LinkGlyph />
        {copied ? "Copied" : "Copy link"}
        <span aria-live="polite" className="sr-only">
          {copied ? "Link copied to clipboard" : ""}
        </span>
      </button>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="inline-flex items-center gap-1.5 rounded-[3px] border border-border px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors ease-out-soft hover:border-gold hover:text-gold"
      >
        <WhatsAppGlyph />
        WhatsApp
      </a>

      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="Share"
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-border px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors ease-out-soft hover:border-gold hover:text-gold"
        >
          <ShareGlyph />
          Share
        </button>
      )}
    </div>
  );
}

/* Inline monochrome glyphs — the shared icon set has no share/link/chat icons,
   and it is intentionally not edited from this lane. Kept tiny + currentColor. */

function LinkGlyph() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.1c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.55-3.7 8.24-8.25 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx={18} cy={5} r={3} />
      <circle cx={6} cy={12} r={3} />
      <circle cx={18} cy={19} r={3} />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
