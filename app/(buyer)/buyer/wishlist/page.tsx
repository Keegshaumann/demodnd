import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getWishlists } from "@/lib/buyer/queries";
import { BuyerTabs } from "@/components/buyer/BuyerTabs";
import { WishlistManager } from "@/components/buyer/WishlistManager";

export const metadata: Metadata = { title: "Wishlist" };

export default async function BuyerWishlistPage() {
  const user = await requireRole("buyer");
  const wishlists = await getWishlists(user.id);

  return (
    <div>
      <header className="mb-2">
        <p className="eyebrow mb-3">My account</p>
        <h1 className="font-serif text-[34px]">Wishlist</h1>
        <p className="mt-2 max-w-[620px] text-sm text-ink-muted">
          Tell us what you&apos;re looking for — even pieces not yet listed. When
          a match is authenticated and goes live, you&apos;ll get an email and an
          in-platform alert.
        </p>
      </header>
      <BuyerTabs />

      <WishlistManager initial={wishlists} />
    </div>
  );
}
