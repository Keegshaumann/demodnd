"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedAction } from "@/lib/buyer/saved";
import { HeartIcon } from "@/components/ui/icons";

/**
 * The single canonical favourite control — reused by ListingCard (top-right of
 * the image), the PDP sticky panel, and the PDP "similar pieces" cards.
 *
 * Optimistic: flips immediately on click, then reconciles with the server. A
 * guest result ({ ok:false, error:"signin" }) routes to /signin instead of
 * toggling; any other failure silently reverts (announced via aria-live).
 *
 *   variant "card"  — frosted pill over the photo; stops the click from
 *                     bubbling to the parent card <Link>.
 *   variant "panel" — full-width outline control beside the PDP buy CTA.
 */
export function FavouriteButton({
  listingId,
  isSavedInitial,
  variant = "card",
  className,
}: {
  listingId: string;
  isSavedInitial: boolean;
  variant?: "card" | "panel";
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(isSavedInitial);
  const [pending, startTransition] = useTransition();
  const [announce, setAnnounce] = useState("");

  function toggle(e: React.MouseEvent) {
    // On the card, the whole tile is a <Link> — never let a save navigate.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !saved;
    setSaved(next); // optimistic
    setAnnounce("");
    startTransition(async () => {
      const res = await toggleSavedAction(listingId);
      if (res.ok) {
        setSaved(res.saved);
        return;
      }
      // Revert the optimistic flip.
      setSaved(!next);
      if (res.error === "signin") {
        const here =
          typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/signin?redirect=${encodeURIComponent(here)}`);
        return;
      }
      setAnnounce("Could not update your saved pieces.");
    });
  }

  const label = saved ? "Saved" : "Save";

  if (variant === "panel") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={`btn btn-outline btn-block ${className ?? ""}`}
      >
        <HeartIcon
          width={16}
          height={16}
          fill={saved ? "currentColor" : "none"}
        />
        {saved ? "Saved" : "Save piece"}
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`pill pill-glass absolute right-4 top-4 z-[2] ${className ?? ""}`}
    >
      <HeartIcon
        width={13}
        height={13}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </button>
  );
}
