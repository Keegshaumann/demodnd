import { NextResponse, type NextRequest } from "next/server";
import { escrow } from "@/lib/escrow/config";
import { handleEscrowWebhook } from "@/lib/escrow/fulfill";

// Webhook verification needs the RAW, unparsed body (mirror of the PayFast ITN
// route, ESCROW-COURIER-SPEC.md §7.3).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Inert until Phase 2 flips ESCROW_ENABLED on and the provider is bound.
  if (!escrow.enabled) {
    return new NextResponse("", { status: 200 });
  }

  const rawBody = await request.text();

  try {
    const outcome = await handleEscrowWebhook(rawBody, request.headers);
    if (!outcome.handled) {
      // Hard-invalid or ignorable event: ack with 200 so the provider stops
      // retrying (we never fulfil an unverified webhook).
      console.error("escrow webhook not handled:", outcome.reason);
    }
    return new NextResponse("", { status: 200 });
  } catch (err) {
    // Transient error (provider/DB) — 500 so the provider retries; fulfilment is
    // idempotent so a retry is safe.
    console.error("escrow webhook: fulfilment error", err);
    return new NextResponse("", { status: 500 });
  }
}
