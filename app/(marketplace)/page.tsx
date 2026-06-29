import Link from "next/link";
import Image from "next/image";
import { CategoryRail } from "@/components/marketplace/CategoryRail";
import { CollectionRail } from "@/components/marketplace/CollectionRail";
import { SoldRail } from "@/components/marketplace/SoldRail";
import { RecentlyViewedRail } from "@/components/marketplace/RecentlyViewedRail";
import { Reveal } from "@/components/ui/Reveal";
import { getActiveListingsPage } from "@/lib/marketplace/listings";
import {
  CURATED_COLLECTIONS,
  getCollectionPreview,
  type CuratedCollection,
} from "@/lib/marketplace/collections";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSavedListingIds } from "@/lib/marketplace/saved";
import { cookies } from "next/headers";
import { GENDER_COOKIE, parseGender } from "@/lib/marketplace/gender";
import { currentSeason, seasonLabel } from "@/lib/marketplace/season";
import {
  ShieldIcon,
  LockIcon,
  TruckIcon,
  RotateIcon,
  StarIcon,
  ArrowRightIcon,
  CameraIcon,
  CertificateIcon,
} from "@/components/ui/icons";


// Two editorial hero images — Rebag-style split. Already-whitelisted
// images.unsplash.com host (next.config.ts); same monochrome luxury palette as
// CategoryRail. w=1200 each since they render side by side.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&q=80";
const HERO_IMAGE_2 =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80";

const TRUST = [
  { icon: ShieldIcon, label: "100% Authenticated" },
  { icon: LockIcon, label: "Insured to R500,000" },
  { icon: TruckIcon, label: "White-glove delivery" },
  { icon: RotateIcon, label: "14-day returns" },
  { icon: StarIcon, label: "4.96 Member rating" },
];

const MARQUEE = [
  "Hermès",
  "Chanel",
  "Louis Vuitton",
  "Rolex",
  "Cartier",
  "Bottega Veneta",
  "Prada",
  "Dior",
  "Gucci",
  "Breitling",
  "Valentino",
  "Bvlgari",
];

const STEPS = [
  {
    icon: CameraIcon,
    title: "You consign",
    body: "Submit photos, courier it to us, or drop it at a depot. We collect from your door, insured.",
  },
  {
    icon: CertificateIcon,
    title: "We authenticate",
    body: "Specialists examine every piece by hand and issue a D&D Certificate of Authenticity before it lists.",
  },
  {
    icon: TruckIcon,
    title: "It's delivered",
    body: "We handle the sale, settle you by EFT, and deliver to the buyer by hand. No fakes, ever.",
  },
];

export default async function HomePage() {
  // A dedicated NEW IN (newest-first) grid (feature 13) + curated-collection
  // previews (feature 10). All fetched in parallel; getCurrentUser is
  // React-cache'd, so hydrating per-card saved-state costs one cheap
  // saved_listings read (empty Set for guests).
  const gender =
    parseGender((await cookies()).get(GENDER_COOKIE)?.value) ?? undefined;
  // "The {Season} Edit" — dynamic rail slotted right after Now Trending; filters
  // to the current Southern-Hemisphere season OR 'all'.
  const season = currentSeason();
  const seasonalEdit: CuratedCollection = {
    key: `season-${season}`,
    eyebrow: "In season",
    title: `The ${seasonLabel(season)} Edit`,
    href: `/browse?season=${season}`,
    filter: { season },
  };
  const collectionConfigs: CuratedCollection[] = [
    ...CURATED_COLLECTIONS.slice(0, 1), // Now Trending stays first
    seasonalEdit,
    ...CURATED_COLLECTIONS.slice(1),
  ];
  const [{ items: newIn }, collectionItems, user] = await Promise.all([
    getActiveListingsPage({ sort: "newest", gender }, 1, 16),
    Promise.all(
      collectionConfigs.map((c) =>
        getCollectionPreview({ ...c.filter, gender }, 12),
      ),
    ),
    getCurrentUser(),
  ]);
  const savedIds = await getSavedListingIds(user?.id ?? null);

  // Only render an edit's rail when its preview returned stock — pair each
  // collection with its (possibly empty) preview slice.
  const collections = collectionConfigs
    .map((c, i) => ({
      config: c,
      items: collectionItems[i] ?? [],
    }))
    .filter((c) => c.items.length > 0);
  // Now Trending leads the page (above New In); the rest follow after it.
  const nowTrending = collections.find((c) => c.config.key === "now-trending");
  const restCollections = collections.filter(
    (c) => c.config.key !== "now-trending",
  );

  // Honest "New in" heading: label by the freshest window that actually covers
  // the items we show, widening when nothing's genuinely new — so the rail is
  // never empty and never overclaims. (We always show the newest pieces.)
  const NEW_IN_INITIAL = 8;
  const oldestShown = newIn[Math.min(NEW_IN_INITIAL, newIn.length) - 1];
  const oldestShownAgeDays = oldestShown
    ? (Date.now() - new Date(oldestShown.createdAt).getTime()) / 86_400_000
    : Infinity;
  const newInHeading =
    oldestShownAgeDays <= 7
      ? "New this week."
      : oldestShownAgeDays <= 31
        ? "New this month."
        : "Latest arrivals.";

  return (
    <>
      {/* Hero — full-bleed two-image split (Rebag-style) with the editorial
          headline + CTAs overlaid and centred over a legibility scrim. */}
      <header className="relative isolate flex min-h-[600px] items-center overflow-hidden lg:min-h-[680px]">
        {/* Two images fill the whole hero, side by side */}
        <div aria-hidden="true" className="absolute inset-0 -z-20 grid grid-cols-2">
          {[HERO_IMAGE, HERO_IMAGE_2].map((src) => (
            <div key={src} className="relative h-full w-full overflow-hidden">
              <Image src={src} alt="" fill priority sizes="50vw" className="object-cover" />
            </div>
          ))}
        </div>
        {/* Balanced scrim — darker through the centre so the centred headline
            stays legible over either image. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 75% at 50% 50%, rgba(13,13,13,0.55), transparent 75%), linear-gradient(180deg, rgba(13,13,13,0.42) 0%, rgba(13,13,13,0.40) 50%, rgba(13,13,13,0.66) 100%)",
          }}
        />
        <div className="dnd-container relative w-full py-16 text-center text-white lg:py-24">
          <Reveal className="mx-auto flex max-w-[780px] flex-col items-center">
            <span className="mb-7 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
              <span className="h-px w-8 bg-white/40" />
              D&amp;D · All things luxury
            </span>
            <h1
              className="mb-7 text-balance text-white [&_em]:text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]"
              style={{
                fontSize: "clamp(40px, 6vw, 80px)",
                letterSpacing: "-0.022em",
                lineHeight: 1.04,
              }}
            >
              Welcome to the largest luxury marketplace <em>in the world.</em>
            </h1>
            <p className="mb-9 max-w-[520px] text-pretty text-[17px] leading-relaxed text-white/90 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)]">
              Authenticated, verified and insured. Every piece checked before it
              ever reaches you — the counterfeit risk of private resale, removed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/browse" className="btn btn-lg bg-white text-ink hover:bg-white/90">
                Shop now <ArrowRightIcon width={17} height={17} />
              </Link>
              <Link
                href="/sell"
                className="btn btn-lg border border-white/60 text-white hover:bg-white/10"
              >
                Sell with D&amp;D
              </Link>
            </div>
          </Reveal>
        </div>
      </header>

      {/* Trust strip */}
      <div className="border-y border-border bg-surface py-6">
        <div className="dnd-container">
          <div className="flex flex-wrap items-center justify-around gap-x-8 gap-y-3.5">
            {TRUST.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 text-xs uppercase tracking-[0.14em] text-ink-muted"
              >
                <Icon width={15} height={15} className="text-gold" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand marquee */}
      <div className="overflow-hidden border-b border-border bg-surface py-6">
        <div className="flex w-max animate-marquee items-center [animation-play-state:running] hover:[animation-play-state:paused]">
          {[...MARQUEE, ...MARQUEE].map((name, i) => (
            <span key={`${name}-${i}`} className="flex items-center">
              <span className="px-[52px] font-serif text-[21px] italic text-ink-dim transition-colors hover:text-ink">
                {name}
              </span>
              <span className="select-none text-border">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Category rail */}
      <CategoryRail />

      {/* NOW TRENDING (promoted) — leads the rails, above New In. */}
      {nowTrending && (
        <CollectionRail
          title={nowTrending.config.title}
          eyebrow={nowTrending.config.eyebrow}
          href={nowTrending.config.href}
          items={nowTrending.items}
          savedIds={savedIds}
        />
      )}

      {/* NEW IN (feature 13) — newest-first, now a single scrollable carousel
          (same rail treatment as the edits). Adaptive heading + "See all". */}
      {newIn.length > 0 && (
        <CollectionRail
          eyebrow="New in"
          title={newInHeading}
          href="/browse?sort=newest"
          viewAllLabel="See all new in"
          items={newIn}
          savedIds={savedIds}
        />
      )}

      {/* CURATED COLLECTIONS / EDITS (feature 10) — the remaining titled rails. */}
      {restCollections.map(({ config, items }) => (
        <CollectionRail
          key={config.key}
          title={config.title}
          eyebrow={config.eyebrow}
          href={config.href}
          items={items}
          savedIds={savedIds}
        />
      ))}

      {/* RECENTLY VIEWED (feature 9) — client rail, hidden until the visitor's
          localStorage history resolves at least one still-available piece. */}
      <RecentlyViewedRail />

      {/* RECENTLY SOLD (feature 6) — social proof that pieces move. Self-fetches
          and hides itself when nothing has sold yet. */}
      <SoldRail />

      {/* The D&D standard — deliberate onyx editorial band */}
      <section className="bg-onyx text-white" style={{ padding: "92px 0 96px" }}>
        <div className="dnd-container">
          <div className="max-w-[640px]">
            <span className="eyebrow eyebrow-dark mb-6">The D&amp;D standard</span>
            <h2
              className="text-white text-balance"
              style={{ fontSize: "clamp(30px,4vw,52px)", lineHeight: 1.08 }}
            >
              Examined by hand, <em className="!text-white/75">before it ever reaches you.</em>
            </h2>
            <p className="mt-5 max-w-[520px] text-pretty text-[15.5px] leading-relaxed text-white/65">
              We are the middleman you can trust. D&amp;D takes physical custody,
              verifies provenance, and only then does a piece go live. The
              counterfeit risk of private resale, removed.
            </p>
          </div>

          <ol className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-white/12 bg-white/12 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-onyx p-8">
                <div className="mb-7 flex items-center justify-between">
                  <step.icon width={26} height={26} className="text-white/85" />
                  <span className="font-serif text-3xl italic text-white/25">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-white" style={{ fontSize: "22px" }}>
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-white/60">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2.5 border-b border-white/30 pb-1.5 text-[12px] uppercase tracking-[0.2em] text-white transition-colors hover:border-white"
            >
              How authentication works <ArrowRightIcon width={15} height={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Sell CTA */}
      <section className="border-b border-border-soft bg-surface" style={{ padding: "72px 0" }}>
        <div className="dnd-container flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-0 max-w-[560px]">
            <h2 className="mb-3" style={{ fontSize: "clamp(28px,3.5vw,42px)" }}>
              Have a piece to sell?
            </h2>
            <p className="text-[15px] leading-relaxed text-ink-muted">
              We authenticate, photograph and list it. D&amp;D handles the sale and
              pays you your share, with white-glove collection from your door.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-3">
            <Link href="/sell" className="btn btn-primary">
              Start listing <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/how-it-works" className="btn btn-outline">
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
