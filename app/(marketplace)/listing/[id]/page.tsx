import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingById, getSimilarListings } from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatZar } from "@/lib/money";
import { categoryLabel, AUTH_METHOD_LABELS } from "@/lib/marketplace/constants";
import { ListingGallery } from "@/components/marketplace/ListingGallery";
import { SellerReputation } from "@/components/marketplace/SellerReputation";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { MobileBuyBar } from "@/components/marketplace/MobileBuyBar";
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
    `${title}. Authenticated luxury, fully insured and delivered by hand. Available on D&D Luxury.`
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
  const visible =
    listing.status === "active" || listing.status === "sold" || isOwner || isAdmin;
  if (!visible) notFound();

  const isSold = listing.status === "sold";
  const isGuest = !user;
  const imageUrls = listing.images.map((img) => img.url);
  const similar = await getSimilarListings(listing);
  const cta = buyCta({ id: listing.id, isSold, isOwner, isGuest });

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

  const specs: { label: string; value: string }[] = [
    { label: "Maison", value: listing.brand },
    ...(listing.model ? [{ label: "Model", value: listing.model }] : []),
    { label: "Category", value: categoryLabel(listing.category) },
    { label: "Condition", value: listing.condition },
    ...(listing.year ? [{ label: "Year", value: String(listing.year) }] : []),
    { label: "Authentication", value: AUTH_METHOD_LABELS[listing.auth_method] },
  ];

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />

      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-10 py-10 lg:grid-cols-[1.1fr_minmax(380px,1fr)] lg:gap-16 lg:py-14">
          {/* Gallery */}
          <ListingGallery
            images={imageUrls}
            alt={`${listing.brand} ${listing.title}`}
          />

          {/* Sticky purchase panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <nav className="mb-4 flex items-center gap-2 text-[12px] text-ink-dim">
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
              <ChevronRightIcon width={13} height={13} />
              <Link href="/browse" className="hover:text-ink">
                Shop
              </Link>
              <ChevronRightIcon width={13} height={13} />
              <Link
                href={`/browse?brand=${encodeURIComponent(listing.brand)}`}
                className="truncate hover:text-ink"
              >
                {listing.brand}
              </Link>
            </nav>

            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-gold">
              {listing.brand}
            </div>
            <h1
              className="text-balance"
              style={{ fontSize: "clamp(30px,3.6vw,42px)", letterSpacing: "-0.012em", lineHeight: 1.1 }}
            >
              {listing.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5 text-gold">
                <CertificateIcon width={14} height={14} /> Authenticated
              </span>
              <span aria-hidden className="text-border">·</span>
              <span>{listing.condition}</span>
              {listing.year && (
                <>
                  <span aria-hidden className="text-border">·</span>
                  <span>{listing.year}</span>
                </>
              )}
              <span aria-hidden className="text-border">·</span>
              <span>{categoryLabel(listing.category)}</span>
            </div>

            <div className="mt-6 flex items-baseline gap-4">
              <div className="price" style={{ fontSize: "clamp(34px,4.6vw,46px)", lineHeight: 1 }}>
                {formatZar(listing.price_cents)}
              </div>
              {isSold && (
                <span className="rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                  Sold
                </span>
              )}
            </div>

            {/* Buy card */}
            <div id="buy-card" className="surface-card mt-7 p-7">
              <BuyPanel
                listingId={listing.id}
                isSold={isSold}
                isOwner={isOwner}
                isGuest={isGuest}
              />
              <ul className="mt-6 grid gap-2.5 border-t border-border-soft pt-6">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-2.5 text-[13.5px] text-ink-muted"
                  >
                    <Icon width={15} height={15} className="mt-0.5 flex-shrink-0 text-gold" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7">
              <SellerReputation sellerId={listing.seller_id} />
            </div>
          </div>
        </div>
      </div>

      {/* The piece — description, provenance, specs */}
      <section className="border-t border-border-soft bg-surface" style={{ padding: "64px 0 72px" }}>
        <div className="dnd-container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
            <div className="min-w-0">
              <div className="eyebrow mb-4">The piece</div>
              <h2 className="mb-5 font-serif text-[30px]">{listing.title}</h2>
              {listing.description ? (
                <p className="max-w-[60ch] text-pretty text-[15.5px] leading-[1.85] text-ink-muted">
                  {listing.description}
                </p>
              ) : (
                <p className="max-w-[60ch] text-[15.5px] leading-[1.85] text-ink-dim">
                  A considered piece from {listing.brand}, authenticated and
                  prepared for sale by D&amp;D Luxury.
                </p>
              )}

              <div className="mt-10 max-w-[60ch] divide-y divide-border-soft border-y border-border-soft">
                <Disclosure
                  title="Authentication & provenance"
                  body={`Examined in person by D&D specialists and listed only after passing review (${AUTH_METHOD_LABELS[listing.auth_method]}). Each sale carries a D&D Certificate of Authenticity. We take custody of every piece, so you never transact with an unverified stranger.`}
                  defaultOpen
                />
                <Disclosure
                  title="Delivery & returns"
                  body="White-glove, fully insured delivery nationwide, included in the price. Inspect on arrival; if it isn't as described, return within 14 days for a full refund."
                />
                <Disclosure
                  title="How payment works"
                  body="Pay securely by card or Instant EFT via PayFast. D&D receives payment and settles the seller directly, so funds and authentication stay under one accountable roof."
                />
              </div>
            </div>

            {/* Specs + certificate callout */}
            <aside className="lg:pt-1">
              <div className="surface-card p-6">
                <div className="caption mb-4 text-gold">Details</div>
                <dl className="divide-y divide-border-soft">
                  {specs.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]"
                    >
                      <dt className="text-ink-muted">{s.label}</dt>
                      <dd className="text-right font-medium text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-[3px] bg-onyx p-5 text-white">
                <CertificateIcon width={22} height={22} className="mt-0.5 flex-shrink-0 text-white/85" />
                <div>
                  <div className="text-[13.5px] font-medium">
                    Certificate of Authenticity
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">
                    Issued by D&amp;D Luxury and included with this piece.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="border-t border-border-soft py-20">
          <div className="dnd-container">
            <div className="mb-12 flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-3">You may also consider</div>
                <h2 className="font-serif text-[clamp(26px,3vw,34px)]">Similar pieces.</h2>
              </div>
              <Link href="/browse" className="btn btn-outline btn-sm">
                View collection <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
              {similar.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 4) * 55}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <MobileBuyBar priceCents={listing.price_cents} cta={cta} />
    </>
  );
}

function buyCta({
  id,
  isSold,
  isOwner,
  isGuest,
}: {
  id: string;
  isSold: boolean;
  isOwner: boolean;
  isGuest: boolean;
}): { label: string; href?: string; disabled?: boolean } {
  if (isSold) return { label: "Sold", disabled: true };
  if (isOwner) return { label: "Manage listing", href: "/seller" };
  if (isGuest)
    return { label: "Sign in to purchase", href: `/signin?redirect=/listing/${id}` };
  return { label: "Proceed to checkout", href: `/checkout/${id}` };
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
      <button disabled className="btn btn-primary btn-lg btn-block" type="button">
        Sold
      </button>
    );
  }
  if (isOwner) {
    return (
      <Link href="/seller" className="btn btn-outline btn-lg btn-block">
        Manage your listing
      </Link>
    );
  }
  if (isGuest) {
    return (
      <Link
        href={`/signin?redirect=/listing/${listingId}`}
        className="btn btn-primary btn-lg btn-block"
      >
        Sign in to purchase <ArrowRightIcon width={16} height={16} />
      </Link>
    );
  }
  return (
    <Link
      href={`/checkout/${listingId}`}
      className="btn btn-primary btn-lg btn-block"
    >
      Proceed to checkout <ArrowRightIcon width={16} height={16} />
    </Link>
  );
}

/** Native, accessible, JS-free disclosure (renders open content for crawlers). */
function Disclosure({
  title,
  body,
  defaultOpen = false,
}: {
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group py-4" {...(defaultOpen ? { open: true } : {})}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center text-ink-dim">
          <span className="absolute h-px w-3 bg-current" />
          <span className="absolute h-3 w-px bg-current transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
        </span>
      </summary>
      <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-ink-muted">
        {body}
      </p>
    </details>
  );
}
