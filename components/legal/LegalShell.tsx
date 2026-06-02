import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";

export function LegalShell({
  title,
  crumb,
  lastUpdated,
  children,
}: {
  title: string;
  crumb: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border-soft" style={{ padding: "72px 0 48px" }}>
        <div className="dnd-container">
          <nav className="mb-5 flex items-center gap-2 text-[12px] text-ink-dim">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <ChevronRightIcon width={13} height={13} />
            <span className="text-ink-muted">{crumb}</span>
          </nav>
          <div className="eyebrow mb-4">Legal</div>
          <h1 style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>{title}</h1>
          <p className="mt-3 text-[13px] text-ink-dim">Last updated: {lastUpdated}</p>
        </div>
      </header>

      <div className="dnd-container py-14">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-8 rounded-[3px] border border-amber-300 bg-amber-50 px-5 py-4 text-[13px] leading-relaxed text-amber-900">
            <strong>Draft template — not yet legal advice.</strong> This document is a
            generic starting point. Before relying on it, have a qualified South
            African attorney review and tailor it to D&amp;D Luxury&apos;s actual
            operations and POPIA obligations.
          </div>

          <div className="[&_a]:text-gold [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mb-1.5 [&_li]:text-[14.5px] [&_li]:leading-relaxed [&_li]:text-ink-muted [&_p]:mb-4 [&_p]:text-[14.5px] [&_p]:leading-relaxed [&_p]:text-ink-muted [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
