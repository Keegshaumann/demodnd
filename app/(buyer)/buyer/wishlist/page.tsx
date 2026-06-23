import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getWishlists } from "@/lib/buyer/queries";
import { getSavedListings } from "@/lib/marketplace/saved";
import { BuyerTabs } from "@/components/buyer/BuyerTabs";
import { WishlistTabs, type WishlistTab } from "@/components/buyer/WishlistTabs";
import { SavedPieces } from "@/components/buyer/SavedPieces";
import { WishlistManager } from "@/components/buyer/WishlistManager";
import { ShareWishlistButton } from "@/components/marketplace/ShareWishlistButton";

export const metadata: Metadata = { title: "Wishlist" };

export default async function BuyerWishlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("buyer");
  const tabParam = (await searchParams).tab;
  const tab: WishlistTab = tabParam === "alerts" ? "alerts" : "saved";

  // Fetch only what the active tab needs.
  const [saved, wishlists] =
    tab === "saved"
      ? [await getSavedListings(user.id), null]
      : [null, await getWishlists(user.id)];

  return (
    <div>
      <header className="mb-2">
        <p className="eyebrow mb-3">My account</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-serif text-[34px]">Wishlist</h1>
          {tab === "saved" && <ShareWishlistButton />}
        </div>
        <p className="mt-2 max-w-[620px] text-sm text-ink-muted">
          {tab === "saved"
            ? "Pieces you've saved, kept in one place. Tap the heart on any listing to add it here."
            : "Tell us what you're looking for — even pieces not yet listed. When a match is authenticated and goes live, you'll get an email and an in-platform alert."}
        </p>
      </header>
      <BuyerTabs />

      <WishlistTabs active={tab} />

      {tab === "saved" ? (
        <SavedPieces listings={saved ?? []} />
      ) : (
        <WishlistManager initial={wishlists ?? []} />
      )}
    </div>
  );
}
