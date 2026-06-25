import type { Metadata } from "next";
import Link from "next/link";
import {
  CertificateIcon,
  LockIcon,
  TruckIcon,
  RotateIcon,
  CameraIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "How we authenticate",
  description:
    "Every piece on D&D Luxury is examined by hand and authenticated — or, for jewellery, independently evaluated — before it goes live. Insured to R500,000, with a Certificate of Authenticity on every item.",
};

// The real process, told plainly. No invented statistics — only promises D&D
// actually keeps. Edit the copy here, not the structure.
const STEPS = [
  {
    icon: CameraIcon,
    title: "Submitted",
    body: "Sellers send high-resolution photos, courier the piece to us insured, or drop it at a depot. Nothing is listed on the seller's word alone.",
  },
  {
    icon: CertificateIcon,
    title: "Examined by hand",
    body: "A specialist inspects the piece against the maison's known construction — stitching, hardware, stamps, serials, materials — for the marks a counterfeit can't fake. Jewellery is independently evaluated and appraised rather than authenticated.",
  },
  {
    icon: LockIcon,
    title: "Certified",
    body: "Only pieces that pass go live, each issued a D&D Certificate of Authenticity. Anything we can't stand behind is returned to the seller — never listed.",
  },
];

const PROMISES = [
  { icon: CertificateIcon, label: "Authenticated or evaluated", note: "Every live piece, before it sells." },
  { icon: LockIcon, label: "Insured to R500,000", note: "Every transaction, every transit." },
  { icon: RotateIcon, label: "14-day returns", note: "Not as described? Send it back." },
  { icon: TruckIcon, label: "White-glove delivery", note: "Hand-delivered, nationwide." },
];

export default function AuthenticationPage() {
  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 56px" }}>
        <div className="dnd-container max-w-[760px]">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">Authentication</span>
          </nav>
          <div className="eyebrow mb-4">The D&D promise</div>
          <h1 className="text-balance" style={{ fontSize: "clamp(34px,4.5vw,56px)", lineHeight: 1.08 }}>
            Examined by hand, <em>before it ever reaches you.</em>
          </h1>
          <p className="mt-6 max-w-[560px] text-[16px] leading-relaxed text-ink-muted">
            The single risk in buying pre-owned luxury is the fake. We remove it.
            Every piece is authenticated — or, for jewellery, independently
            evaluated — by a specialist, in person, before it is ever listed.
          </p>
        </div>
      </header>

      <section style={{ padding: "64px 0" }}>
        <div className="dnd-container grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-gold">
                  <Icon width={18} height={18} />
                </span>
                <span className="font-serif text-[15px] text-ink-dim">0{i + 1}</span>
              </div>
              <h2 className="mb-2 font-serif text-2xl">{title}</h2>
              <p className="text-[14px] leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border-soft bg-surface" style={{ padding: "48px 0" }}>
        <div className="dnd-container grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
          {PROMISES.map(({ icon: Icon, label, note }) => (
            <div key={label} className="flex flex-col gap-2">
              <Icon width={20} height={20} className="text-gold" />
              <div className="font-serif text-[17px] leading-tight text-ink">{label}</div>
              <div className="text-[12px] text-ink-dim">{note}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "72px 0 88px" }}>
        <div className="dnd-container flex flex-col items-center text-center">
          <h2 className="font-serif" style={{ fontSize: "clamp(26px,3.2vw,38px)" }}>
            Shop with the doubt removed.
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/browse" className="btn btn-primary">
              Shop the collection <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/sell" className="btn btn-outline">
              Sell a piece
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
