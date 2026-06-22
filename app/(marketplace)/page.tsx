import Link from "next/link";
import Image from "next/image";
import { CategoryRail } from "@/components/marketplace/CategoryRail";
import { HeroSearch } from "@/components/marketplace/HeroSearch";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { getActiveListingsPage } from "@/lib/marketplace/listings";
import { getCurrentUser } from "@/lib/auth/guards";
import { getSavedListingIds } from "@/lib/marketplace/saved";
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

const QUICK_LINKS = [
  { href: "/browse?category=bags", label: "Bags" },
  { href: "/browse?category=jewellery", label: "Jewellery" },
  { href: "/browse?category=watches", label: "Watches" },
  { href: "/browse?category=shoes", label: "Shoes" },
  { href: "/browse?category=accessories", label: "Accessories" },
  { href: "/browse?category=apparel", label: "Apparel" },
];

// Large editorial hero image — already-whitelisted images.unsplash.com host
// (next.config.ts). Reuses the same monochrome luxury photography palette as
// CategoryRail; w=1600 for a crisp split-layout frame.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1600&q=80";

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
  // Featured-first, newest after — fetch exactly the 8 cards the grid shows.
  // getCurrentUser is React-cache'd, so hydrating per-card saved-state costs one
  // cheap saved_listings read (empty Set for guests).
  const [{ items: latest }, user] = await Promise.all([
    getActiveListingsPage({ sort: "featured" }, 1, 8),
    getCurrentUser(),
  ]);
  const savedIds = await getSavedListingIds(user?.id ?? null);

  return (
    <>
      {/* Hero — bold editorial split: confident serif headline + SHOP NOW on the
          left, a large luxury image on the right. Monochrome / Cormorant. */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 18% 30%, rgba(0,0,0,0.035), transparent 66%), linear-gradient(135deg, #F8F8F8 0%, #F0F0F0 62%, #F8F8F8 100%)",
          }}
        />
        <div className="dnd-container">
          <div className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            {/* Text column */}
            <Reveal className="order-2 lg:order-1">
              <span className="eyebrow mb-7">D&amp;D · All things luxury</span>
              <h1
                className="mb-7 max-w-[16ch] text-balance"
                style={{
                  fontSize: "clamp(40px, 6.4vw, 88px)",
                  letterSpacing: "-0.022em",
                  lineHeight: 1.03,
                }}
              >
                Welcome to the largest luxury marketplace{" "}
                <em>in the world.</em>
              </h1>
              <p className="mb-9 max-w-[520px] text-pretty text-[17px] leading-relaxed text-ink-muted">
                Authenticated, evaluated and insured. Every piece examined by
                hand before it ever reaches you — the counterfeit risk of private
                resale, removed.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/browse" className="btn btn-primary btn-lg">
                  Shop now <ArrowRightIcon width={17} height={17} />
                </Link>
                <Link href="/sell" className="btn btn-outline btn-lg">
                  Sell with D&amp;D
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] uppercase tracking-[0.14em] text-ink-dim">
                  Browse:
                </span>
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-full border border-border px-3.5 py-1.5 text-[11.5px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-gold hover:text-gold"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </Reveal>

            {/* Image column */}
            <Reveal delay={120} className="order-1 lg:order-2">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[3px] border border-border-soft bg-card shadow-[0_30px_60px_-32px_rgba(0,0,0,0.32)] sm:aspect-[5/5] lg:aspect-[4/5]">
                <Image
                  src={HERO_IMAGE}
                  alt="A curated selection of authenticated luxury handbags from D&D Luxury"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  className="object-cover brightness-[0.97]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 55%, rgba(13,13,13,0.18) 100%)",
                  }}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      {/* Search band — kept reachable in its own slim bordered strip below the
          hero, so the editorial headline stays uncrowded. Single top border;
          the trust strip below provides the next divider. */}
      <div className="border-t border-border bg-surface pb-2 pt-7">
        <div className="dnd-container flex justify-center">
          <HeroSearch />
        </div>
      </div>

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

      {/* Latest pieces */}
      {latest.length > 0 && (
        <section className="border-t border-border-soft" style={{ padding: "80px 0 100px" }}>
          <div className="dnd-container">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-3">New in</div>
                <h2 className="font-serif" style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>
                  Latest pieces.
                </h2>
              </div>
              <Link href="/browse" className="btn btn-outline btn-sm">
                View all <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latest.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 7) * 55}>
                  <ListingCard listing={l} isSaved={savedIds.has(l.id)} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

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
