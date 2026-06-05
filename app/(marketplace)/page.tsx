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
  CameraIcon,
  CertificateIcon,
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
    note: "Hermès, Chanel, Bottega",
    img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=80",
    cls: "col-span-2 lg:col-span-1 lg:row-span-2",
    aspect: "aspect-[16/11] lg:aspect-auto",
  },
  {
    href: "/browse?category=watches",
    name: "Watches",
    note: "Rolex, Patek, AP",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1100&q=80",
    cls: "col-span-2 lg:col-span-2",
    aspect: "aspect-[16/10] lg:aspect-auto",
  },
  {
    href: "/browse?category=jewellery",
    name: "Jewellery",
    note: "Cartier, Bvlgari",
    img: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=700&q=80",
    cls: "col-span-1",
    aspect: "aspect-[4/5] lg:aspect-auto",
  },
  {
    href: "/browse?category=shoes",
    name: "Shoes",
    note: "Dior, Valentino",
    img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=700&q=80",
    cls: "col-span-1",
    aspect: "aspect-[4/5] lg:aspect-auto",
  },
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
  const featured = await getActiveListings({ sort: "featured" });
  const latest = featured.slice(0, 8);

  return (
    <>
      {/* Hero */}
      <header className="relative isolate" style={{ padding: "116px 0 92px" }}>
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 72% 38%, rgba(0,0,0,0.03), transparent 68%), linear-gradient(135deg, #F8F8F8 0%, #F0F0F0 60%, #F8F8F8 100%)",
          }}
        />
        <HeroDeco />
        <div className="dnd-container relative z-[3] flex flex-col items-center text-center">
          <span className="eyebrow mb-6">Authenticated · Insured · South African</span>
          <h1
            className="mb-6 max-w-[15ch] text-balance"
            style={{
              fontSize: "clamp(44px, 6vw, 86px)",
              letterSpacing: "-0.022em",
              lineHeight: 1.04,
            }}
          >
            The luxury you want, <em>proven real.</em>
          </h1>
          <p className="mb-10 max-w-[600px] text-pretty text-[17px] leading-relaxed text-ink-muted">
            South Africa&apos;s authenticated marketplace for pre-owned luxury.
            Every piece examined by hand, insured to R500,000, delivered to your
            door.
          </p>
          <HeroSearch />
          <div className="flex flex-wrap items-center justify-center gap-2">
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

      {/* Category bento */}
      <section style={{ padding: "76px 0 84px" }}>
        <div className="dnd-container">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <h2 style={{ fontSize: "clamp(28px,3.4vw,40px)" }}>Shop by category.</h2>
            <Link
              href="/browse"
              className="link-underline self-end text-[12px] uppercase tracking-[0.18em] text-ink-muted hover:text-gold"
            >
              View everything
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3.5 lg:h-[600px] lg:grid-cols-3 lg:grid-rows-2">
            {CATEGORIES.map((cat, i) => (
              <Reveal key={cat.href} delay={i * 70} className={`${cat.cls} min-h-0`}>
                <Link
                  href={cat.href}
                  className={`group relative block h-full w-full overflow-hidden rounded-[3px] border border-border-soft bg-card ${cat.aspect}`}
                >
                  <Image
                    src={cat.img}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover brightness-[0.62] transition-[transform,filter] duration-[1100ms] ease-out-soft group-hover:scale-[1.05] group-hover:brightness-[0.5]"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-5 pt-16"
                    style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.78))" }}
                  >
                    <div>
                      <span className="block font-serif text-2xl font-medium text-white">
                        {cat.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] uppercase tracking-[0.16em] text-white/65">
                        {cat.note}
                      </span>
                    </div>
                    <span className="mb-1 translate-x-[-6px] text-white opacity-0 transition-all duration-500 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100">
                      <ArrowRightIcon width={18} height={18} />
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
                  <ListingCard listing={l} />
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
