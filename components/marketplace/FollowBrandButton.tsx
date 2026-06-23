"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowBrandAction } from "@/lib/brands/follow";

/**
 * Follow-a-designer control — used on the PDP brand line and the designer page.
 *
 * Optimistic, mirroring FavouriteButton: the label flips immediately on click,
 * then reconciles with the server. A guest result ({ ok:false, error:"signin" })
 * routes to /signin (preserving the current path) instead of toggling; any other
 * failure silently reverts (announced via aria-live).
 *
 *   variant "pill"   — compact inline pill for the PDP brand eyebrow.
 *   variant "button" — full outline button for the designer-page hero.
 */
export function FollowBrandButton({
  brand,
  isFollowingInitial,
  variant = "pill",
  className,
}: {
  brand: string;
  isFollowingInitial: boolean;
  variant?: "pill" | "button";
  className?: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(isFollowingInitial);
  const [pending, startTransition] = useTransition();
  const [announce, setAnnounce] = useState("");

  function toggle(e: React.MouseEvent) {
    // Defensive — this control may sit inside other clickable surfaces.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !following;
    setFollowing(next); // optimistic
    setAnnounce("");
    startTransition(async () => {
      const res = await toggleFollowBrandAction(brand);
      if (res.ok) {
        setFollowing(res.following);
        return;
      }
      // Revert the optimistic flip.
      setFollowing(!next);
      if (res.error === "signin") {
        const here =
          typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/signin?redirect=${encodeURIComponent(here)}`);
        return;
      }
      setAnnounce("Could not update your follows.");
    });
  }

  const label = following ? "Following" : `Follow ${brand}`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        className={`btn btn-outline ${className ?? ""}`}
      >
        {following ? "Following" : "Follow"}
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
      aria-pressed={following}
      aria-label={label}
      className={`inline-flex items-center rounded-[3px] border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ease-out-soft disabled:opacity-60 ${
        following
          ? "border-gold bg-gold text-white"
          : "border-border text-ink-muted hover:border-gold hover:text-gold"
      } ${className ?? ""}`}
    >
      {following ? "Following" : "+ Follow"}
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </button>
  );
}
