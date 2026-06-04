import Link from "next/link";

/** Top announcement bar — matches `.announce-bar` in the demo. */
export function AnnounceBar() {
  return (
    <div
      className="relative z-[101] bg-gold text-center uppercase text-white/85"
      style={{
        padding: "11px 24px",
        fontSize: "10.5px",
        letterSpacing: "0.2em",
      }}
    >
      Free authentication on every piece &nbsp;·&nbsp; Insured to R500,000
      &nbsp;·&nbsp; White-glove delivery nationwide &nbsp;·&nbsp;{" "}
      <Link
        href="/concierge"
        className="border-b border-white/50 pb-px text-white/90 transition-colors hover:border-white hover:text-white"
      >
        Concierge available 7 days
      </Link>
    </div>
  );
}
