import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatZar } from "@/lib/money";
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ClockIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = { title: "Order Confirmed" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const piId = first(params.payment_intent);
  const redirectStatus = first(params.redirect_status);

  // Stripe sets redirect_status on return; trust it for the headline. We never
  // retrieve the PaymentIntent here (that would leak amounts for any guessed id).
  const succeeded = redirectStatus === "succeeded";
  let amountCents: number | null = null;
  let orderId: string | null = null;

  // Resolve the order via the buyer's own RLS-bound client — they can only ever
  // read their own order, so a spoofed payment_intent reveals nothing.
  const user = await getCurrentUser();
  if (user && piId) {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, gross_amount_cents")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    if (order) {
      orderId = order.id;
      amountCents = order.gross_amount_cents;
    }
  }

  if (!succeeded) {
    return (
      <div className="dnd-container flex min-h-[60vh] items-center justify-center py-16">
        <div className="surface-card max-w-[520px] p-12 text-center">
          <h1 className="mb-3 font-serif text-[28px]">Payment not completed</h1>
          <p className="mb-7 text-[15px] text-ink-muted">
            Your payment wasn&apos;t completed. No charge has been made — you can
            try again from the listing.
          </p>
          <Link href="/browse" className="btn btn-primary">
            Back to the collection <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dnd-container flex min-h-[60vh] items-center justify-center py-16">
      <div className="surface-card max-w-[560px] p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 text-gold">
          <CheckCircleIcon width={32} height={32} />
        </div>
        <div className="eyebrow mb-4">Order confirmed</div>
        <h1 className="mb-3 font-serif text-[32px]">Thank you for your purchase.</h1>
        <p className="mx-auto mb-6 max-w-[420px] text-[15px] text-ink-muted">
          {amountCents !== null ? (
            <>
              We&apos;ve received your payment of{" "}
              <strong className="text-ink">{formatZar(amountCents)}</strong>. D&amp;D
              Luxury will arrange white-glove delivery and keep you updated.
            </>
          ) : (
            <>
              We&apos;ve received your payment. D&amp;D Luxury will arrange
              white-glove delivery and keep you updated.
            </>
          )}
        </p>

        {!orderId && (
          <p className="mx-auto mb-6 flex max-w-[420px] items-center justify-center gap-2 text-[12.5px] text-ink-dim">
            <ClockIcon width={14} height={14} /> Finalizing your order — it will
            appear in your account momentarily.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={orderId ? `/buyer/orders/${orderId}` : "/buyer"}
            className="btn btn-primary"
          >
            View my order <ArrowRightIcon width={16} height={16} />
          </Link>
          <Link href="/browse" className="btn btn-outline">
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
