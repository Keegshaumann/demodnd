"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { publicEnv } from "@/lib/env.public";
import { formatZar } from "@/lib/money";
import { LockIcon } from "@/components/ui/icons";

const stripePromise = loadStripe(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#0D0D0D",
    colorText: "#1A1A1A",
    colorBackground: "#FFFFFF",
    colorDanger: "#e85d5d",
    fontFamily: "Raleway, Inter, system-ui, sans-serif",
    borderRadius: "3px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #E5E5E5", padding: "12px 14px" },
    ".Input:focus": { border: "1px solid #0D0D0D", boxShadow: "none" },
    ".Label": {
      fontSize: "10.5px",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#888888",
    },
  },
};

export function CheckoutForm({
  clientSecret,
  amountCents,
}: {
  clientSecret: string;
  amountCents: number;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <InnerForm amountCents={amountCents} />
    </Elements>
  );
}

function InnerForm({ amountCents }: { amountCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    // If we get here, confirmation failed immediately (otherwise the browser
    // redirects to return_url). Show the message.
    if (error) {
      setError(error.message ?? "Payment could not be completed.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 className="mb-4 font-serif text-xl">Delivery address</h3>
      <div className="mb-7">
        <AddressElement options={{ mode: "shipping" }} />
      </div>

      <h3 className="mb-4 font-serif text-xl">Payment</h3>
      <PaymentElement />

      {error && <p className="mt-4 text-[13px] text-[#e85d5d]">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn btn-primary btn-block mt-7"
      >
        {submitting ? "Processing…" : `Pay ${formatZar(amountCents)}`}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-ink-dim">
        <LockIcon width={13} height={13} /> Secured by Stripe · D&amp;D Luxury
      </p>
    </form>
  );
}
