"use client";

import { useState, useTransition } from "react";
import {
  sendConciergeMessageAction,
  type ConciergeInput,
} from "@/lib/concierge/actions";
import { CheckCircleIcon } from "@/components/ui/icons";

const REASONS = [
  "General enquiry",
  "Source a specific piece",
  "Purchase question",
  "Selling / listing question",
  "Private viewing",
  "Press",
  "Partnership",
];

export function ConciergeForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ConciergeInput>({
    name: "",
    email: "",
    phone: "",
    reason: "General enquiry",
    message: "",
  });
  const [consent, setConsent] = useState(false);

  function set<K extends keyof ConciergeInput>(key: K, v: string) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Please agree to be contacted about this enquiry.");
      return;
    }
    startTransition(async () => {
      const res = await sendConciergeMessageAction(values);
      if (res.ok) setSent(true);
      else setError(res.error);
    });
  }

  if (sent) {
    return (
      <div className="surface-card p-10 text-center sm:p-12">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/20 text-gold">
          <CheckCircleIcon width={28} height={28} />
        </div>
        <h3 className="mb-3 font-serif text-[26px]">Message received.</h3>
        <p className="mx-auto max-w-[420px] text-[15px] text-ink-muted">
          A member of our concierge team will respond personally within one
          business day. For urgent matters, please call us directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface-card p-7 sm:p-9">
      <div className="eyebrow mb-3">Send us a message</div>
      <h2 className="mb-7 font-serif text-[30px]">How can we help?</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Full name</span>
          <input
            className="field-input"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input
            type="email"
            className="field-input"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="field-label">Mobile (optional)</span>
          <input
            type="tel"
            className="field-input"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Reason for contact</span>
          <select
            className="field-input"
            value={values.reason}
            onChange={(e) => set("reason", e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Tell us more</span>
          <textarea
            className="field-input"
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Share the piece you have in mind, the occasion, or anything we should know…"
            required
          />
        </label>
      </div>

      <label className="mt-5 flex items-start gap-2.5 py-2 text-[13px] text-ink-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          I agree to be contacted regarding this enquiry. We never share your
          details with third parties.
        </span>
      </label>

      {error && <p className="mb-3 text-[13px] text-[#e85d5d]">{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-block">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
