import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * "Quiet gallery" — the homepage category rail.
 *
 * Hermès-quiet catalogue treatment: bright, only lightly-darkened photography in
 * a hairline frame, with the category name + note set BELOW the image on the
 * page background (not overlaid) for clean legibility. Hovering lifts the whole
 * tile under a single soft shadow, the name shifts to the ink accent, the image
 * gently zooms, and an arrow slides in.
 *
 * Responsive ladder (no horizontal overflow on mobile):
 *   <640px  → horizontal scroll-snap rail (peeking tiles signal "swipe")
 *   640px+  → 3-up grid wrap
 *   1024px+ → 6-up single row, equal width
 */

type Category = {
  name: string;
  href: string;
  note: string;
  img: string;
};

const CATEGORIES: Category[] = [
  {
    name: "Bags",
    href: "/browse?category=bags",
    note: "Hermès, Chanel, Bottega",
    img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=80",
  },
  {
    name: "Jewellery",
    href: "/browse?category=jewellery",
    note: "Cartier, Bvlgari",
    img: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&q=80",
  },
  {
    name: "Watches",
    href: "/browse?category=watches",
    note: "Rolex, Patek, AP",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80",
  },
  {
    name: "Shoes",
    href: "/browse?category=shoes",
    note: "Dior, Valentino",
    img: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=900&q=80",
  },
  {
    name: "Accessories",
    href: "/browse?category=accessories",
    note: "Sunglasses, silk, belts",
    img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=80",
  },
  {
    name: "Apparel",
    href: "/browse?category=apparel",
    note: "Dior, Saint Laurent",
    img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
  },
];

export function CategoryRail() {
  return (
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

        {/*
          Mobile: scroll-snap rail (overflow-x). Tiles take a fixed flex basis so
          a neighbour peeks → an obvious affordance to swipe. The negative inline
          margin + matching padding lets the rail bleed to the container edges
          while keeping the first/last tile aligned to the gutter.
          640px+: the rail releases into a 3-col grid; 1024px+: 6 equal cols.
        */}
        <div className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-5 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {CATEGORIES.map((cat, i) => (
            <Reveal
              key={cat.href}
              delay={i * 70}
              className="min-w-0 shrink-0 basis-[78%] snap-start sm:basis-auto"
            >
              <Link href={cat.href} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[3px] border border-border-soft bg-card transition-[transform,box-shadow] duration-500 ease-out-soft group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_44px_-18px_rgba(0,0,0,0.28)]">
                  <Image
                    src={cat.img}
                    alt={`Shop ${cat.name}`}
                    fill
                    sizes="(max-width: 640px) 78vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover brightness-[0.96] transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="block font-serif text-[22px] leading-tight text-ink transition-colors duration-300 group-hover:text-gold">
                      {cat.name}
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-ink-dim">
                      {cat.note}
                    </span>
                  </div>
                  <span className="mt-1 translate-x-[-6px] text-ink opacity-0 transition-all duration-500 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRightIcon width={18} height={18} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
