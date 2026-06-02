import Link from "next/link";
import Image from "next/image";
import { HeroDeco } from "@/components/marketplace/HeroDeco";
import { HeroSearch } from "@/components/marketplace/HeroSearch";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Reveal } from "@/components/ui/Reveal";
import { getActiveListings } from "@/lib/marketplace/listings";
import {
  ShieldIcon,
  LockIcon,
  TruckIcon,
  RotateIcon,
  StarIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";

const QUICK_LINKS = [
  { href: "/browse?category=bags", label: "Handbags" },
  { href: "/browse?category=watches", label: "Watches" },
  { href: "/browse?category=jewellery", label: "Jewellery" },
  { href: "/browse?category=shoes", label: "Shoes" },
];

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

const CATEGORIES = [
  {
    href: "/browse?category=bags",
    name: "Handbags",
    img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
  },
  {
    href: "/browse?category=watches",
    name: "Watches",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
  },
  {
    href: "/browse?category=jewellery",
    name: "Jewellery",
    img: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80",
  },
  {
    href: "/browse?category=shoes",
    name: "Shoes",
    img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80",
  },
];

export default async function HomePage() {
  const featured = await getActiveListings({ sort: "featured" });
  const latest = featured.slice(0, 8);

  return (
    <>
      {/* Hero */}
      <header
        className="relative isolate"
        style={{ padding: "120px 0 96px" }}
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 72% 38%, rgba(0,0,0,0.03), transparent 68%), linear-gradient(135deg, #F8F8F8 0%, #F0F0F0 60%, #F8F8F8 100%)",
          }}
        />
        <HeroDeco />
        <div className="dnd-container relative z-[3] flex flex-col items-center text-center">
          <span className="eyebrow mb-5">Authenticated · Insured · South African</span>
          <h1
            className="mb-5 max-w-[1100px]"
            style={{
              fontSize: "clamp(44px, 5.8vw, 80px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.06,
            }}
          >
            South Africa&apos;s authenticated
            <br />
            <em>luxury marketplace.</em>
          </h1>
          <p className="mb-9 max-w-[680px] text-[17px] leading-relaxed text-ink-muted">
            Every piece independently authenticated by D&amp;D Luxury, fully
            insured, and delivered by hand. Buy with total confidence.
          </p>
          <HeroSearch />
          <div className="flex flex-wrap items-center gap-2">
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

      {/* Category tiles */}
      <section className="border-b border-border-soft" style={{ padding: "56px 0 72px" }}>
        <div className="dnd-container">
          <span className="mb-7 block text-[11px] uppercase tracking-[0.3em] text-gold">
            Shop by category
          </span>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {CATEGORIES.map((cat, i) => (
              <Reveal key={cat.href} delay={i * 70}>
              <Link
                href={cat.href}
                className="group relative block aspect-[3/4] overflow-hidden rounded-[3px] border border-border-soft bg-card transition-all duration-[420ms] ease-out-soft hover:-translate-y-1.5 hover:border-gold/10 hover:shadow-md"
              >
                <Image
                  src={cat.img}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover brightness-[0.6] transition-transform duration-700 ease-out-soft group-hover:scale-[1.07] group-hover:brightness-[0.5]"
                />
                <div
                  className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-14"
                  style={{
                    background: "linear-gradient(transparent, rgba(0,0,0,0.82))",
                  }}
                >
                  <span className="block font-serif text-2xl font-medium text-white">
                    {cat.name}
                  </span>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Latest pieces */}
      {latest.length > 0 && (
        <section style={{ padding: "80px 0 100px" }}>
          <div className="dnd-container">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-3">New in</div>
                <h2 className="font-serif text-[34px]">Latest pieces.</h2>
              </div>
              <Link href="/browse" className="btn btn-outline btn-sm">
                View all <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latest.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 7) * 55}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sell CTA */}
      <section className="border-y border-border-soft bg-surface" style={{ padding: "56px 0" }}>
        <div className="dnd-container flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-0">
            <div className="eyebrow mb-4">List a piece</div>
            <h2 className="mb-2.5" style={{ fontSize: "clamp(28px,3.5vw,40px)" }}>
              Have a piece to sell?
            </h2>
            <p className="max-w-[520px] text-[15px] text-ink-muted">
              We authenticate, photograph and list your item. D&amp;D handles the
              sale and pays you your share — white-glove collection from your
              door.
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
