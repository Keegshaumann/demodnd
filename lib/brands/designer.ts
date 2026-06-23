import "server-only";
import {
  getActiveListings,
  type ListingCardData,
} from "@/lib/marketplace/listings";

/**
 * Server-only data + copy helpers for the shop-by-designer route
 * (/designer/<slug>). A `server-only` data-reader module (NOT "use server"): it
 * exports a non-async config map alongside the async reader, which a "use
 * server" file could not do without wrapping the config as an action and
 * corrupting the manifest. Mirrors lib/marketplace/listings.ts.
 */

/** A brand's active listings (reuses the browse query + cover-image join). */
export async function getDesignerListings(
  brand: string,
): Promise<ListingCardData[]> {
  return getActiveListings({ brands: [brand] });
}

/**
 * Editorial hero copy per maison. Optional: brands without an entry fall back to
 * the generic blurb in {@link designerBlurb}, so the route works for every brand
 * in BRANDS even before bespoke copy is written.
 */
const DESIGNER_BLURBS: Record<string, string> = {
  Hermès:
    "The Parisian maison whose Birkin and Kelly remain the most enduring objects of desire in luxury — each one authenticated by D&D Luxury before it reaches you.",
  Chanel:
    "From the quilted flap to the timeless tweed, Chanel pieces hold their place at the centre of any considered collection. Every piece independently authenticated.",
  "Louis Vuitton":
    "The monogram that defined modern travel. Pre-loved Louis Vuitton, examined in person and listed only once it passes authentication.",
  Rolex:
    "The most collected watchmaker in the world. Each Rolex on D&D Luxury is authenticated and prepared for sale, ready to be worn for the next generation.",
  Cartier:
    "Jeweller to kings and king of jewellers. Cartier pieces are independently evaluated for provenance and condition before they go live.",
  Dior:
    "House of couture and the Lady Dior. Pre-owned Dior, authenticated and held in custody by D&D Luxury until it reaches its next owner.",
  "Audemars Piguet":
    "The Royal Oak changed watchmaking forever. Every Audemars Piguet is authenticated by our specialists before listing.",
  Gucci:
    "Italian craft with an unmistakable signature. Pre-loved Gucci, authenticated and photographed in detail before sale.",
  "Bottega Veneta":
    "Quiet luxury defined by the Intrecciato weave. Each Bottega Veneta piece is authenticated before it appears here.",
  Prada:
    "Milanese precision and the Saffiano finish. Pre-owned Prada, examined in person and authenticated by D&D Luxury.",
  "Patek Philippe":
    "You never actually own a Patek Philippe. Every piece is authenticated and held in custody until it passes to its next custodian.",
  Bvlgari:
    "Roman boldness in jewellery and watches alike. Bvlgari pieces are independently evaluated before they are listed.",
};

/** Hero blurb for a brand (bespoke copy where written, generic fallback else). */
export function designerBlurb(brand: string): string {
  return (
    DESIGNER_BLURBS[brand] ??
    `Pre-loved ${brand}, each piece independently authenticated and held in custody by D&D Luxury before it reaches its next owner.`
  );
}
