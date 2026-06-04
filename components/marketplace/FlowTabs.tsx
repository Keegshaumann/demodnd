"use client";

import { useState } from "react";
import {
  SearchIcon,
  LockIcon,
  CheckCircleIcon,
  CameraIcon,
  CertificateIcon,
  TruckIcon,
} from "@/components/ui/icons";

type Step = {
  icon: (p: { width?: number; height?: number; className?: string }) => React.ReactNode;
  title: string;
  body: string;
};

const BUYER_STEPS: Step[] = [
  {
    icon: SearchIcon,
    title: "Browse the archive",
    body: "Every piece is authenticated by D&D — in person or by photo review — condition-graded and studio-photographed before it is ever listed.",
  },
  {
    icon: LockIcon,
    title: "Purchase securely",
    body: "Check out with PayFast — pay by card or Instant EFT. Your payment is protected and white-glove delivery is arranged by D&D, fully insured in transit.",
  },
  {
    icon: CheckCircleIcon,
    title: "Confirm receipt",
    body: "Your piece arrives by hand with its provenance. Confirm delivery in your account within the 14-day window.",
  },
];

const SELLER_STEPS: Step[] = [
  {
    icon: CameraIcon,
    title: "Submit your piece",
    body: "Upload photos and details, then choose how you'd like it authenticated: photo review, courier to D&D, or drop-off at a depot. Authentication is free.",
  },
  {
    icon: CertificateIcon,
    title: "We authenticate & list",
    body: "Our specialists verify every piece within three working days. Approved items go live in the marketplace automatically.",
  },
  {
    icon: TruckIcon,
    title: "Get paid",
    body: "When your piece sells, D&D collects the payment and settles your share — the sale price less your plan's commission — via EFT.",
  },
];

export function FlowTabs() {
  const [tab, setTab] = useState<"buyers" | "sellers">("buyers");
  const steps = tab === "buyers" ? BUYER_STEPS : SELLER_STEPS;

  return (
    <div>
      <div className="mb-12 flex justify-center gap-1 border-b border-border">
        <Tab active={tab === "buyers"} onClick={() => setTab("buyers")}>
          For Buyers
        </Tab>
        <Tab active={tab === "sellers"} onClick={() => setTab("sellers")}>
          For Sellers
        </Tab>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <article key={s.title} className="animate-fadeIn text-center">
            <span className="mb-4 block font-serif text-[40px] text-ink-dim">
              0{i + 1}
            </span>
            <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border text-gold">
              <s.icon width={22} height={22} />
            </span>
            <h4 className="mb-2 font-sans text-[15px] font-semibold uppercase tracking-[0.1em] text-ink">
              {s.title}
            </h4>
            <p className="text-[14px] leading-relaxed text-ink-muted">{s.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-dim hover:text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}
