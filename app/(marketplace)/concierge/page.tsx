import type { Metadata } from "next";
import Link from "next/link";
import { ConciergeForm } from "@/components/marketplace/ConciergeForm";
import {
  ChevronRightIcon,
  SearchIcon,
  EyeIcon,
  ClockIcon,
  CertificateIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Concierge",
  description:
    "Speak directly with the D&D Luxury concierge — sourcing, purchases, listings and private viewings.",
};

const CHANNELS = [
  {
    icon: ClockIcon,
    title: "By telephone",
    body: "Mon–Sat, 09:00–19:00 SAST. A discreet line answered by a senior concierge.",
    cta: "+27 21 000 0000",
    href: "tel:+27210000000",
  },
  {
    icon: CertificateIcon,
    title: "By email",
    body: "Replies within four working hours. Attach images for sourcing requests.",
    cta: "concierge@dndluxury.co.za",
    href: "mailto:concierge@dndluxury.co.za",
  },
];

const HELP = [
  { icon: SearchIcon, text: "Sourcing pieces not currently in the collection — discreetly, on commission." },
  { icon: EyeIcon, text: "Private viewings of higher-value pieces by appointment." },
  { icon: CertificateIcon, text: "Guidance on authenticating and listing pieces you'd like to sell." },
];

export default function ConciergePage() {
  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 56px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Concierge</span>
          </nav>
          <div className="eyebrow mb-4">A direct line</div>
          <h1 style={{ fontSize: "clamp(34px,4.5vw,56px)" }}>
            Speak with our concierge.
          </h1>
          <p className="mt-5 max-w-[600px] text-[15px] text-ink-muted">
            Sourcing a particular piece, a question about a purchase, or guidance
            on selling — we respond personally, usually within the hour.
          </p>
        </div>
      </header>

      <div className="dnd-container py-14">
        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <div key={c.title} className="surface-card p-6">
              <c.icon width={22} height={22} className="mb-3 text-gold" />
              <h4 className="mb-1 font-serif text-xl">{c.title}</h4>
              <p className="mb-3 text-[13.5px] text-ink-muted">{c.body}</p>
              <a href={c.href} className="text-[14px] text-gold hover:underline">
                {c.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <ConciergeForm />

          <aside className="lg:sticky lg:top-24">
            <div className="eyebrow mb-4">Our team</div>
            <h3 className="mb-3 font-serif text-2xl">What we can help with</h3>
            <p className="mb-7 text-[14px] leading-relaxed text-ink-muted">
              Our concierge team are collectors and curators in their own right.
              They take quiet pride in handling the unusual.
            </p>
            <ul className="space-y-4">
              {HELP.map((h) => (
                <li key={h.text} className="flex gap-3.5">
                  <h.icon width={18} height={18} className="mt-0.5 flex-shrink-0 text-gold" />
                  <span className="text-[14px] leading-relaxed text-ink-muted">
                    {h.text}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
