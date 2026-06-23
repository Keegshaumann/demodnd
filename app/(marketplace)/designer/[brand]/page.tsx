import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { slugToBrand, brandToSlug } from "@/lib/brands/slug";
import { getDesignerListings, designerBlurb } from "@/lib/brands/designer";
import { isFollowingBrand } from "@/lib/brands/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSavedListingIds } from "@/lib/marketplace/saved";
import { DesignerHero } from "@/components/marketplace/DesignerHero";
import { FollowBrandButton } from "@/components/marketplace/FollowBrandButton";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowRightIcon, SearchIcon } from "@/components/ui/icons";

/**
 * Shop-by-designer route — /designer/<slug>. The slug resolves to a canonical
 * maison via slugToBrand (404 for unknown brands), then renders an editorial
 * hero + Follow control + the brand's active listings (reusing ListingCard).
 * generateMetadata gives each maison page a real title/description + canonical.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = slugToBrand(slug);
  if (!brand) return { title: "Designer" };

  const canonical = `/designer/${brandToSlug(brand)}`;
  const description = `Shop authenticated pre-loved ${brand} on D&D Luxury — every piece independently authenticated, insured and delivered by hand.`;
  return {
    title: `${brand} | D&D Luxury`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${brand} · D&D Luxury`,
      description,
      url: canonical,
      type: "website",
    },
  };
}

export default async function DesignerPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const brand = slugToBrand(slug);
  if (!brand) notFound();

  const user = await getCurrentUser();
  // Fetch the brand's pieces, saved-state, and follow-state together.
  const [listings, savedIds, following] = await Promise.all([
    getDesignerListings(brand),
    getSavedListingIds(user?.id ?? null),
    isFollowingBrand(user?.id ?? null, brand),
  ]);

  return (
    <>
      <DesignerHero
        brand={brand}
        blurb={designerBlurb(brand)}
        count={listings.length}
        action={
          <FollowBrandButton
            brand={brand}
            isFollowingInitial={following}
            variant="button"
          />
        }
      />

      <div className="dnd-container">
        <main className="min-w-0 py-12 lg:py-14">
          {listings.length === 0 ? (
            <div className="flex flex-col items-center rounded-[3px] border border-dashed border-border bg-surface px-6 py-20 text-center">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-dim">
                <SearchIcon width={20} height={20} />
              </span>
              <h2 className="font-serif text-2xl">
                No {brand} in residence right now.
              </h2>
              <p className="mt-2 max-w-[380px] text-[14px] text-ink-muted">
                Follow {brand} to be alerted the moment a new piece is
                authenticated and goes live — or tell our concierge what
                you&apos;re hunting for.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/browse" className="btn btn-outline btn-sm">
                  Browse all pieces
                </Link>
                <Link href="/concierge" className="btn btn-primary btn-sm">
                  Ask the concierge <ArrowRightIcon width={15} height={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 6) * 45}>
                  <ListingCard
                    listing={l}
                    priority={i < 3}
                    isSaved={savedIds.has(l.id)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
