import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getListingById,
  getSimilarListings,
  type ListingDetail,
} from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSavedListingIds } from "@/lib/marketplace/saved";
import { getSaveCounts } from "@/lib/marketplace/social";
import { isFollowingBrand } from "@/lib/brands/queries";
import { getOfferForPdp, type PdpOfferState } from "@/lib/offers/queries";
import { offerFloorCents } from "@/lib/offers/expiry";
import { roleCanAccess } from "@/lib/auth/roles";
import { retailDiscount } from "@/lib/marketplace/pricing";
import { formatZar } from "@/lib/money";
import {
  brandedTitle,
  categoryLabel,
  AUTH_METHOD_LABELS,
  categoryProcess,
  processBadgeLabel,
  processNoun,
} from "@/lib/marketplace/constants";
import { brandToSlug } from "@/lib/brands/slug";
import { ListingGallery } from "@/components/marketplace/ListingGallery";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { FavouriteButton } from "@/components/marketplace/FavouriteButton";
import {
  MakeOfferButton,
  type OfferDisabledReason,
} from "@/components/marketplace/MakeOfferButton";
import { ConditionInfo } from "@/components/marketplace/ConditionInfo";
import { MobileBuyBar } from "@/components/marketplace/MobileBuyBar";
import { ViewTracker } from "@/components/marketplace/ViewTracker";
import { RecentlyViewed } from "@/components/marketplace/RecentlyViewed";
import { ShareButton } from "@/components/marketplace/ShareButton";
import { FollowBrandButton } from "@/components/marketplace/FollowBrandButton";
import { SocialProof } from "@/components/marketplace/SocialProof";
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
  const title = brandedTitle(listing);
  const guarantee = processBadgeLabel(listing.category); // "Authenticated" | "Evaluated"
  const description = (
    listing.description ??
    `${title}. ${guarantee} luxury, fully insured and delivered by hand. Available on D&D Luxury.`
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

/**
 * Trust features for the buy card. The first row is process-aware
 * (authenticated vs evaluated/appraised — see {@link processBadgeLabel}); the
 * rest are constant.
 */
const FEATURES_REST = [
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

  // Saved-state for this piece + the "similar" rail, in one cheap query (empty
  // Set for guests). FavouriteButton hydrates from it; the optimistic island
  // takes over from there.
  //
  // Alongside it, the social-proof inputs and PDP follow-state, in parallel:
  //  - saveCount: global save count for THIS piece (service-role read inside
  //    getSaveCounts, since saved_listings is owner-RLS) — quiet social proof.
  //  - isFollowing: whether the viewer already follows this maison (false for
  //    guests), to hydrate the FollowBrandButton on the brand line.
  // view_count is read straight off the listing row (no extra query).
  const [savedIds, saveCounts, isFollowing] = await Promise.all([
    getSavedListingIds(user?.id ?? null),
    getSaveCounts([id]),
    isFollowingBrand(user?.id ?? null, listing.brand),
  ]);
  const saveCount = saveCounts.get(id) ?? 0;
  const viewCount = listing.view_count ?? 0;

  // Retail / resale-value anchor: only non-null when an original-retail (MSRP)
  // price exists AND sits strictly above the asking price — then we strike it
  // through and show "X% below retail" so the price reads as a deal. Otherwise
  // null and the price renders exactly as before (no anchor, no tag).
  const retail = retailDiscount(listing.price_cents, listing.retail_price_cents);

  const isOwner = user?.id === listing.seller_id;
  const isAdmin = user?.role === "admin";
  const visible =
    listing.status === "active" || listing.status === "sold" || isOwner || isAdmin;
  if (!visible) notFound();

  const isSold = listing.status === "sold";
  const isGuest = !user;
  // Mirrors the /checkout guards (BUY-1 role check + account status): these
  // accounts would be silently redirected back here, so show an explanatory
  // disabled state instead of a dead-end "Proceed to checkout" CTA.
  const buyBlocked: BuyBlocked =
    !user || isOwner
      ? null
      : !roleCanAccess(user.role, "buyer")
        ? "role"
        : user.status !== "active"
          ? "status"
          : null;
  const imageUrls = listing.images.map((img) => img.url);
  const cta = buyCta({ id: listing.id, isSold, isOwner, isGuest, buyBlocked });

  // Process-aware trust model (single source of truth in constants): jewellery
  // is *evaluated* (appraisal), everything else *authenticated*. Drives the
  // gallery/inline badge label and the provenance/trust copy below.
  const badgeLabel = processBadgeLabel(listing.category);
  const isDouble = categoryProcess(listing.category) === "double";
  const processNounWord = processNoun(listing.category);
  const features = [
    {
      icon: CertificateIcon,
      text: isDouble
        ? "Double-authenticated by D&D specialists"
        : "Verified online via Entrupy",
    },
    ...FEATURES_REST,
  ];

  // --- Make-an-offer eligibility (Stage 2) -------------------------------
  // Mirrors the buy-card gating so offers and purchases stay in lockstep. The
  // owner, a sold piece, or a non-buyer/ineligible account can't offer (the
  // control hides); guests get a sign-in prompt; eligible buyers can offer (and
  // see their open offer's state if they already have one). The floor is the
  // shared 70%-of-price lower bound. Only an eligible buyer pays the extra
  // offer read — everyone else short-circuits with a null offer.
  const offerFloorC = offerFloorCents(listing.price_cents);
  const offerDisabledReason: OfferDisabledReason = isSold
    ? "sold"
    : isOwner
      ? "owner"
      : isGuest
        ? "guest"
        : buyBlocked === "role"
          ? "role"
          : buyBlocked === "status"
            ? "status"
            : null;
  const existingOffer: PdpOfferState | null =
    user && offerDisabledReason === null
      ? await getOfferForPdp(user.id, listing.id)
      : null;
  // Whether to surface the "Make an offer" affordance in the mobile buy bar:
  // only when an offer is actually possible (eligible buyer or a guest who can
  // sign in to make one) — not for owner/sold/role/status.
  const offerAvailable =
    offerDisabledReason === null || offerDisabledReason === "guest";

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: brandedTitle(listing),
    brand: { "@type": "Brand", name: listing.brand },
    category: categoryLabel(listing.category),
    description: listing.description ?? brandedTitle(listing),
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
        item: `${SITE}/designer/${brandToSlug(listing.brand)}`,
      },
      { "@type": "ListItem", position: 4, name: listing.title },
    ],
  };

  // Trim empty inclusions defensively (seller free-text can leave blanks).
  const inclusions = (listing.inclusions ?? [])
    .map((i) => i.trim())
    .filter(Boolean);
  const specs: { label: string; value: string }[] = [
    { label: "Maison", value: listing.brand },
    ...(listing.model ? [{ label: "Model", value: listing.model }] : []),
    { label: "Category", value: categoryLabel(listing.category) },
    { label: "Condition", value: listing.condition },
    ...(listing.measurements
      ? [{ label: "Measurements", value: listing.measurements }]
      : []),
    ...(inclusions.length
      ? [{ label: "Comes with", value: inclusions.join(", ") }]
      : []),
    ...(listing.year ? [{ label: "Year", value: String(listing.year) }] : []),
    {
      label: isDouble ? "Authentication" : "Verification",
      value: AUTH_METHOD_LABELS[listing.auth_method],
    },
  ];

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />

      {/* Render-nothing islands: bump view_count once per real load (client-side
          so RSC prefetch can't inflate it) and record this piece in the
          visitor's recently-viewed history. */}
      <ViewTracker listingId={listing.id} />
      <RecentlyViewed listingId={listing.id} />

      <div className="dnd-container">
        <div className="grid grid-cols-1 items-start gap-10 py-10 lg:grid-cols-[1.1fr_minmax(380px,1fr)] lg:gap-16 lg:py-14">
          {/* Gallery */}
          <ListingGallery
            images={imageUrls}
            alt={brandedTitle(listing)}
            badge={badgeLabel}
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
                href={`/designer/${brandToSlug(listing.brand)}`}
                className="truncate hover:text-ink"
              >
                {listing.brand}
              </Link>
            </nav>

            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-gold">
                {listing.brand}
              </span>
              <FollowBrandButton
                brand={listing.brand}
                isFollowingInitial={isFollowing}
              />
            </div>
            <h1
              className="text-balance"
              style={{ fontSize: "clamp(30px,3.6vw,42px)", letterSpacing: "-0.012em", lineHeight: 1.1 }}
            >
              {listing.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5 text-gold">
                <CertificateIcon width={14} height={14} /> {badgeLabel}
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
              {/* Quiet social proof — only surfaces a metric once it clears the
                  minimum (>= 3), else renders nothing (no anaemic "1 view"). */}
              <SocialProof saveCount={saveCount} viewCount={viewCount} />
            </div>

            <div className="mt-6">
              <div className="flex items-baseline gap-4">
                <div className="price" style={{ fontSize: "clamp(34px,4.6vw,46px)", lineHeight: 1 }}>
                  {formatZar(listing.price_cents)}
                </div>
                {isSold && (
                  <span className="rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                    Sold
                  </span>
                )}
              </div>
              {/* Retail / resale-value anchor — only when a higher original-retail
                  (MSRP) price exists. The struck-through retail plus the "X% below
                  retail" tag frame the asking price as a deal. Absent otherwise. */}
              {retail && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                  <span className="text-ink-dim">
                    Retail{" "}
                    <span className="line-through decoration-from-font">
                      {formatZar(retail.retailCents)}
                    </span>
                  </span>
                  <span className="inline-flex items-center rounded-[3px] border border-gold/30 bg-gold/[0.04] px-2 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-gold">
                    {retail.pct}% below retail
                  </span>
                </div>
              )}
            </div>

            {/* Buy card */}
            <div id="buy-card" className="surface-card mt-7 p-7">
              <BuyPanel
                listingId={listing.id}
                isSold={isSold}
                isOwner={isOwner}
                isGuest={isGuest}
                buyBlocked={buyBlocked}
              />
              {/* Save beside the buy CTA. Hidden for the owner (who sees
                  "Manage your listing"); guests get a sign-in prompt on click
                  via the island, so no auth gating is needed here. */}
              {!isOwner && (
                <div className="mt-3">
                  <FavouriteButton
                    listingId={listing.id}
                    isSavedInitial={savedIds.has(listing.id)}
                    variant="panel"
                  />
                </div>
              )}
              {/* Make an offer (Stage 2) — under the buy CTA + Save. Renders the
                  buyer's existing-offer state, a guest sign-in prompt, or the
                  offer button; hides itself for owner/sold/role/status. */}
              <MakeOfferButton
                listingId={listing.id}
                priceCents={listing.price_cents}
                floorCents={offerFloorC}
                existingOffer={existingOffer}
                disabledReason={offerDisabledReason}
              />
              <ul className="mt-6 grid gap-2.5 border-t border-border-soft pt-6">
                {features.map(({ icon: Icon, text }) => (
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

            {/* Share — copy link / WhatsApp / native share. No backend. */}
            <div className="mt-5">
              <ShareButton
                url={`${SITE}/listing/${listing.id}`}
                title={brandedTitle(listing)}
              />
            </div>

            {/* Buyer-facing anonymity: D&D never reveals the seller. The
                authentication/evaluation guarantee carries the trust — no name,
                rating, or profile link. The seller's own dashboard + admin keep
                full identity. */}
            <div className="mt-7 flex items-start gap-3 rounded-[3px] border border-border-soft bg-card p-5">
              <LockIcon width={18} height={18} className="mt-0.5 flex-shrink-0 text-gold" />
              <div>
                <div className="text-[13.5px] font-medium text-ink">Verified Seller</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                  Sellers stay anonymous. Every piece is{" "}
                  {isDouble ? "double-authenticated" : "Entrupy-verified"} and held
                  in custody by D&amp;D Luxury — you transact only with us.
                </p>
              </div>
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
                  A considered piece from {listing.brand},{" "}
                  {isDouble ? "double-authenticated" : "Entrupy-verified"} and
                  prepared for sale by D&amp;D Luxury.
                </p>
              )}

              {/* Condition report — the graded condition with the seller's notes
                  (set post-approval). The grade always shows; the notes block
                  only appears when notes were provided. The info affordance
                  links to the condition guide on /how-it-works. */}
              <div className="mt-10 max-w-[60ch] rounded-[3px] border border-border-soft bg-card p-6">
                <div className="caption mb-3 text-gold">Condition report</div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[22px] leading-none text-ink">
                    {listing.condition}
                  </span>
                  <ConditionInfo grade={listing.condition} />
                </div>
                {listing.condition_notes && (
                  <p className="mt-3.5 text-[14px] leading-relaxed text-ink-muted">
                    {listing.condition_notes}
                  </p>
                )}
              </div>

              <div className="mt-10 max-w-[60ch] divide-y divide-border-soft border-y border-border-soft">
                <Disclosure
                  title={
                    isDouble
                      ? "Authentication & provenance"
                      : "Verification & provenance"
                  }
                  body={
                    isDouble
                      ? `Examined in person by D&D specialists and listed only after passing ${processNounWord}. Each sale carries a D&D Certificate of Authenticity. We take custody of every piece, so you never transact with an unverified stranger.`
                      : `Verified online through Entrupy — our AI authentication partner — and listed only after passing ${processNounWord}. Each sale carries a Certificate of Authenticity. We take custody of every piece, so you never transact with an unverified stranger.`
                  }
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
                    {isDouble
                      ? "Issued by D&D Luxury and included with this piece."
                      : "Verified via Entrupy and issued with this piece."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Similar */}
      <SimilarPieces listing={listing} savedIds={savedIds} />

      <MobileBuyBar
        priceCents={listing.price_cents}
        cta={cta}
        secondary={
          offerAvailable
            ? { label: "Make an offer", href: "#buy-card" }
            : undefined
        }
      />
    </>
  );
}

/**
 * "Similar pieces" rail. Fetches its own data so the query runs as a streamed
 * child instead of extending the page's sequential waterfall.
 */
async function SimilarPieces({
  listing,
  savedIds,
}: {
  listing: Pick<ListingDetail, "id" | "category">;
  savedIds: Set<string>;
}) {
  const similar = await getSimilarListings(listing);
  if (similar.length === 0) return null;
  return (
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
              <ListingCard listing={l} isSaved={savedIds.has(l.id)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Why a signed-in, non-owner account can't check out (null = it can). */
type BuyBlocked = "role" | "status" | null;

function buyCta({
  id,
  isSold,
  isOwner,
  isGuest,
  buyBlocked,
}: {
  id: string;
  isSold: boolean;
  isOwner: boolean;
  isGuest: boolean;
  buyBlocked: BuyBlocked;
}): { label: string; href?: string; disabled?: boolean } {
  if (isSold) return { label: "Sold", disabled: true };
  if (isOwner) return { label: "Manage listing", href: "/seller" };
  if (isGuest)
    return { label: "Sign in to purchase", href: `/signin?redirect=/listing/${id}` };
  if (buyBlocked === "role")
    return { label: "Buyer account required", disabled: true };
  if (buyBlocked === "status")
    return { label: "Purchasing unavailable", disabled: true };
  return { label: "Proceed to checkout", href: `/checkout/${id}` };
}

function BuyPanel({
  listingId,
  isSold,
  isOwner,
  isGuest,
  buyBlocked,
}: {
  listingId: string;
  isSold: boolean;
  isOwner: boolean;
  isGuest: boolean;
  buyBlocked: BuyBlocked;
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
  if (buyBlocked) {
    return (
      <div>
        <button disabled className="btn btn-primary btn-lg btn-block" type="button">
          {buyBlocked === "role" ? "Buyer account required" : "Purchasing unavailable"}
        </button>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-dim">
          {buyBlocked === "role"
            ? "You're signed in with a seller account — purchases require a buyer account."
            : "This account isn't currently eligible to make purchases."}
        </p>
      </div>
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
