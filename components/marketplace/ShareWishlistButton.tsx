"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";

/**
 * "Share wishlist" affordance for /buyer/wishlist. Copy-link, WhatsApp, and the
 * native share sheet (when present). No backend — the wishlist URL is shared as
 * an invitation, not the buyer's private list. Monochrome editorial buttons.
 *
 * `url` defaults to the canonical /buyer/wishlist on the current origin, resolved
 * on the client (the component is a buyer-only island, so window is available).
 */
export function ShareWishlistButton({
  url,
  title = "My D&D Luxury wishlist",
}: {
  url?: string;
  title?: string;
}) {
  const [shareUrl, setShareUrl] = useState(url ?? "");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!url && typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/buyer/wishlist`);
    }
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op; the WhatsApp
      // and native paths still work, and the user can copy from the address bar.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: title, url: shareUrl });
    } catch {
      // User dismissed the share sheet, or it failed — silently ignore.
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} — ${shareUrl}`)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="btn btn-outline btn-sm"
        aria-live="polite"
      >
        {copied ? (
          <>
            <CheckIcon width={15} height={15} /> Copied
          </>
        ) : (
          "Copy link"
        )}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm"
      >
        WhatsApp
      </a>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className="btn btn-outline btn-sm">
          Share
        </button>
      )}
    </div>
  );
}
