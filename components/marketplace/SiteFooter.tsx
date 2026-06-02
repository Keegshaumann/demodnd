import Link from "next/link";
import Image from "next/image";

/** Dark site footer — matches the final demo footer (#0D0D0D, light text). */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-gold pb-10 pt-24">
      <div className="dnd-container">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo-light.svg"
                alt="D&D Luxury"
                width={42}
                height={42}
              />
            </Link>
            <p className="mt-5 max-w-[340px] text-sm leading-relaxed text-white/45">
              South Africa&apos;s authenticated luxury marketplace. Buy and sell
              timeless pieces — every item independently authenticated and
              handled with the discretion it deserves.
            </p>
          </div>

          <FooterCol
            title="Shop"
            links={[
              { href: "/browse?category=bags", label: "Handbags" },
              { href: "/browse?category=watches", label: "Watches" },
              { href: "/browse?category=jewellery", label: "Jewellery" },
              { href: "/browse?category=shoes", label: "Shoes" },
            ]}
          />
          <FooterCol
            title="Marketplace"
            links={[
              { href: "/how-it-works", label: "How it works" },
              { href: "/sell", label: "Sell with us" },
              { href: "/concierge", label: "Concierge" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { href: "/how-it-works", label: "About" },
              { href: "/concierge", label: "Contact" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/35">
          <span>© 2026 D&amp;D Luxury (Pty) Ltd. All rights reserved.</span>
          <span className="uppercase tracking-[0.2em]">
            Authenticated · Insured · South African
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h5 className="mb-6 font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-white/90">
        {title}
      </h5>
      <ul className="space-y-3.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-white/45 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
