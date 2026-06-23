"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletterAction } from "@/lib/newsletter/subscribe";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success" }
  | { kind: "duplicate" };

// Mirror the action's server-side guard so obviously-invalid input is caught
// before a round-trip; the action re-validates authoritatively.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Footer email-capture form. Styled for the dark footer (bg-gold / near-black):
 * white/10 borders, light text. Optimistic-free, single-shot — submitting moves
 * idle → submitting → success / duplicate / error, with the input swapped for a
 * confirmation line on success so it reads as "done" rather than re-promptable.
 * 390px-safe: the input + button stack into a single row that can shrink.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const done = status.kind === "success" || status.kind === "duplicate";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus({ kind: "error", message: "Enter a valid email." });
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await subscribeNewsletterAction(value);
      if (res.ok) {
        setStatus(res.duplicate ? { kind: "duplicate" } : { kind: "success" });
        setEmail("");
        return;
      }
      setStatus({ kind: "error", message: res.error });
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-2.5 rounded-[3px] border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
        <CheckIcon
          width={16}
          height={16}
          className="mt-0.5 flex-shrink-0 text-white"
        />
        <span>
          {status.kind === "success"
            ? "You're subscribed. Watch your inbox for new arrivals."
            : "You're already on the list — nothing more to do."}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-[340px]">
      <div className="flex items-stretch overflow-hidden rounded-[3px] border border-white/15 bg-white/[0.04] transition-colors focus-within:border-white/40">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          aria-invalid={status.kind === "error"}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe"
          className="flex flex-shrink-0 items-center gap-1.5 self-stretch border-l border-white/15 px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {pending ? "…" : "Join"}
          <ArrowRightIcon width={14} height={14} />
        </button>
      </div>
      <p
        aria-live="polite"
        className={`mt-2 min-h-[1rem] text-[12px] ${
          status.kind === "error" ? "text-red-300/90" : "text-white/45"
        }`}
      >
        {status.kind === "error"
          ? status.message
          : "Private arrivals and price drops. No noise — unsubscribe anytime."}
      </p>
    </form>
  );
}
