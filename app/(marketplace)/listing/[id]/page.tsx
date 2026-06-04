import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingById, getSimilarListings } from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatZar } from "@/lib/money";
import { categoryLabel } from "@/lib/marketplace/constants";
import { ListingGallery } from "@/components/marketplace/ListingGallery";
import { SellerReputation } from "@/components/marketplace/SellerReputation";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
import {
  ChevronRightIcon,
  CertificateIcon,
  LockIcon,
  TruckIcon,
  RotateIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Listing" };
  const title = `${listing.brand} ${listing.title}`;
  const description = (
    listing.description ??
    `${title} — authenticated luxury, fully insured and delivered by hand. Available on D&D Luxury.`
  ).slice(0, 160);
  const path = `/listing/${listing.id}`;
  const image = listing.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

const FEATURES = [
  { icon: CertificateIcon, text: "Authenticated by D&D Luxury" },
  { icon: LockIcon, text: "Insured to R500,000 in transit" },
  { icon: TruckIcon, text: "White-glove delivery nationwide" },
  { icon: RotateIcon, text: "14-day returns" },
];

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, user] = await Promise.all([
    getListingById(id),
    getCurrentUser(),
  ]);
  if (!listing) notFound();

  const isOwner = user?.id === listing.seller_id;
  const isAdmin = user?.role === "admin";
  const visible = listing.status === "active" || listing.status === "sold" || isOwner || isAdmin;
  if (!visible) notFound();

  const isSold = listing.status === "sold";
  const imageUrls = listing.images.map((img) => img.url);
  const similar = await getSimilarListings(listing);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${listing.brand} ${listing.title}`,
    brand: { "@type": "Brand", name: listing.brand },
    category: categoryLabel(listing.category),
    description: listing.description ?? `${listing.brand} ${listing.title}`,
    ...(imageUrls.length ? { image: imageUrls } : {}),
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: (listing.price_cents / 100).toFixed(2),
      availability: isSold
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      url: `${SITE}/listing/${listing.id}`,
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE}/browse` },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.brand,
        item: `${SITE}/browse?brand=${encodeURIComponent(listing.brand)}`,
      },
      { "@type": "ListItem", position: 4, name: listing.title },
    ],
  };

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-12 py-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          {/* Gallery */}
          <ListingGallery
            images={imageUrls}
            alt={`${listing.brand} ${listing.title}`}
          />

          {/* Detail side */}
          <div>
            <nav className="mb-3.5 flex items-center gap-2 text-[12px] text-ink-dim">
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
              <ChevronRightIcon width={13} height={13} />
              <Link href="/browse" className="hover:text-ink">
                Shop
              </Link>
              <ChevronRightIcon width={13} height={13} />
              <span className="text-ink-muted">{listing.brand}</span>
            </nav>

            <div className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-gold">
              {listing.brand}
            </div>
            <h1
              className="mb-5"
              style={{ fontSize: "clamp(32px,4vw,44px)", letterSpacing: "-0.012em" }}
            >
              {listing.title}
            </h1>

            <div className="mb-7 flex flex-wrap gap-7 border-b border-border-soft pb-7 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <CertificateIcon width={14} height={14} className="text-gold" />
                Authenticated
              </span>
              <span>
                <strong className="text-ink">Condition:</strong>{" "}
                {listing.condition}
              </span>
              {listing.year && (
                <span>
                  <strong className="text-ink">Year:</strong> {listing.year}
                </span>
              )}
              <span>
                <strong className="text-ink">Category:</strong>{" "}
                {categoryLabel(listing.category)}
              </span>
            </div>

            {listing.description && (
              <p className="mb-9 text-[15px] leading-[1.8] text-ink-muted">
                {listing.description}
              </p>
            )}

            {/* Action card */}
            <div className="surface-card mb-7 p-8">
              <div className="mb-7 flex items-baseline justify-between gap-4 border-b border-border-soft pb-6">
                <div className="font-serif text-[40px] leading-none text-silver">
                  {formatZar(listing.price_cents)}
                </div>
                {isSold && (
                  <span className="rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                    Sold
                  </span>
                )}
              </div>

              <ul className="mb-6 space-y-2.5">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-2.5 text-[13.5px] text-ink-muted"
                  >
                    <Icon width={14} height={14} className="mt-0.5 text-gold" />
                    {text}
                  </li>
                ))}
              </ul>

              <BuyPanel
                listingId={listing.id}
                isSold={isSold}
                isOwner={isOwner}
                isGuest={!user}
              />
            </div>

            {/* Seller reputation */}
            <SellerReputation sellerId={listing.seller_id} />
          </div>
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="border-t border-border-soft bg-surface py-20">
          <div className="dnd-container">
            <div className="mb-12 flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-3">You may also consider</div>
                <h2 className="font-serif text-[34px]">Similar pieces.</h2>
              </div>
              <Link href="/browse" className="btn btn-outline">
                View collection <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 xl:grid-cols-4">
              {similar.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 4) * 55}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function BuyPanel({
  listingId,
  isSold,
  isOwner,
  isGuest,
}: {
  listingId: string;
  isSold: boolean;
  isOwner: boolean;
  isGuest: boolean;
}) {
  if (isSold) {
    return (
      <button disabled className="btn btn-primary btn-block" type="button">
        Sold
      </button>
    );
  }
  if (isOwner) {
    return (
      <Link href="/seller" className="btn btn-outline btn-block">
        Manage your listing
      </Link>
    );
  }
  if (isGuest) {
    return (
      <Link
        href={`/signin?redirect=/listing/${listingId}`}
        className="btn btn-primary btn-block"
      >
        Sign in to purchase <ArrowRightIcon width={16} height={16} />
      </Link>
    );
  }
  return (
    <Link href={`/checkout/${listingId}`} className="btn btn-primary btn-block">
      Proceed to checkout <ArrowRightIcon width={16} height={16} />
    </Link>
  );
}
