import { describe, it, expect } from "vitest";
import {
  computeEscrowCharge,
  expectedEscrowGrossCents,
  resolveOfferBinding,
  escrowEventToStatus,
} from "@/lib/escrow/logic";
import type {
  CreateEscrowInput,
  CreateEscrowResult,
  EscrowProvider,
  EscrowStatus,
  EscrowWebhookResult,
} from "@/lib/escrow/provider";

// ---------------------------------------------------------------------------
// Anti-tamper: what the buyer must fund = item (or agreed offer) + shipping,
// and commission is on the ITEM only (never on the courier pass-through).
// ---------------------------------------------------------------------------
describe("computeEscrowCharge (anti-tamper amounts)", () => {
  it("no shipping (Phase 1): gross == item, commission on item", () => {
    const c = computeEscrowCharge({
      listingPriceCents: 100_000,
      feeRateBps: 1200,
    });
    expect(c.itemCents).toBe(100_000);
    expect(c.shippingCents).toBe(0);
    expect(c.grossCents).toBe(100_000);
    expect(c.commissionCents).toBe(12_000);
    expect(c.sellerPayoutCents).toBe(88_000);
  });

  it("folds shipping into gross WITHOUT commissioning it", () => {
    const c = computeEscrowCharge({
      listingPriceCents: 100_000,
      shippingCents: 15_000,
      feeRateBps: 1200,
    });
    expect(c.grossCents).toBe(115_000); // item + shipping
    expect(c.commissionCents).toBe(12_000); // still on the item only
    expect(c.sellerPayoutCents).toBe(88_000); // item - commission (shipping excluded)
    // Invariant: the three splits reconstruct gross exactly.
    expect(c.commissionCents + c.sellerPayoutCents + c.shippingCents).toBe(c.grossCents);
  });

  it("accepted-offer price overrides the listing price", () => {
    const c = computeEscrowCharge({
      listingPriceCents: 100_000,
      agreedCents: 80_000,
      shippingCents: 15_000,
      feeRateBps: 1200,
    });
    expect(c.itemCents).toBe(80_000);
    expect(c.grossCents).toBe(95_000);
    expect(c.commissionCents).toBe(9_600);
    expect(c.sellerPayoutCents).toBe(70_400);
  });

  it("expectedEscrowGrossCents matches computeEscrowCharge.grossCents", () => {
    const input = { listingPriceCents: 250_000, shippingCents: 9_900, feeRateBps: 1000 };
    expect(expectedEscrowGrossCents(input)).toBe(computeEscrowCharge(input).grossCents);
  });

  it("detects a tampered (under-)payment: funded amount != expected gross", () => {
    const expected = expectedEscrowGrossCents({
      listingPriceCents: 100_000,
      shippingCents: 15_000,
      feeRateBps: 1200,
    });
    const tamperedFundedAmount = 100_000; // buyer tried to skip the shipping
    expect(tamperedFundedAmount).not.toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Offer binding consistency (mirror of the PayFast custom_str4 check).
// ---------------------------------------------------------------------------
describe("resolveOfferBinding", () => {
  it("binds when intent and echoed offer ids agree", () => {
    expect(resolveOfferBinding("offer-1", "offer-1")).toEqual({
      offerId: "offer-1",
      consistent: true,
    });
  });
  it("full-price checkout (no offer either side) is consistent, binds nothing", () => {
    expect(resolveOfferBinding(null, null)).toEqual({ offerId: null, consistent: true });
  });
  it("treats a one-sided offer id as consistent (no tamper channel), binds the intent's", () => {
    expect(resolveOfferBinding("offer-1", null)).toEqual({
      offerId: "offer-1",
      consistent: true,
    });
  });
  it("refuses to bind when the echoed offer id disagrees (tamper)", () => {
    expect(resolveOfferBinding("offer-1", "offer-2")).toEqual({
      offerId: null,
      consistent: false,
    });
  });
});

// ---------------------------------------------------------------------------
// Post-funding event -> escrow_status mapping (spec §7.3).
// ---------------------------------------------------------------------------
describe("escrowEventToStatus", () => {
  it("released stamps escrow_released_at", () => {
    expect(escrowEventToStatus("released")).toEqual({
      status: "released",
      timestampColumn: "escrow_released_at",
    });
  });
  it("maps the remaining events to their status with no timestamp", () => {
    expect(escrowEventToStatus("funded").status).toBe("funded");
    expect(escrowEventToStatus("refunded")).toEqual({ status: "refunded", timestampColumn: null });
    expect(escrowEventToStatus("disputed")).toEqual({ status: "disputed", timestampColumn: null });
    expect(escrowEventToStatus("cancelled")).toEqual({ status: "cancelled", timestampColumn: null });
  });
});

// ---------------------------------------------------------------------------
// A fake provider proves the EscrowProvider interface is satisfiable, and lets
// us exercise the funded->fulfil dispatch + escrow_id idempotency at the logic
// layer (the authoritative DB guard is fulfill_escrow_order, tested in the
// Postgres harness).
// ---------------------------------------------------------------------------
class FakeEscrowProvider implements EscrowProvider {
  private byId = new Map<string, { status: EscrowStatus; orderRef: string; amountCents: number }>();
  private seq = 0;

  async createTransaction(input: CreateEscrowInput): Promise<CreateEscrowResult> {
    const escrowId = `esc_${++this.seq}`;
    this.byId.set(escrowId, {
      status: "created",
      orderRef: input.orderRef,
      amountCents: input.amountCents,
    });
    return { escrowId, payUrl: `https://pay.example.test/${escrowId}` };
  }
  /** Test helper: simulate the buyer funding the escrow. */
  markFunded(escrowId: string): void {
    const t = this.byId.get(escrowId);
    if (t) t.status = "funded";
  }
  async getTransaction(escrowId: string): Promise<{ status: EscrowStatus; orderRef?: string }> {
    const t = this.byId.get(escrowId);
    if (!t) throw new Error("unknown escrow id");
    return { status: t.status, orderRef: t.orderRef };
  }
  async releaseToSeller(): Promise<void> {}
  async refundToBuyer(): Promise<void> {}
  async cancelTransaction(): Promise<void> {}
  verifyWebhook(rawBody: string, _headers: Headers): EscrowWebhookResult {
    // Fake signed payload: `{escrowId, event}` JSON. A real provider verifies a
    // signature/HMAC or re-fetches; here the shape stands in for that.
    try {
      const { escrowId, event } = JSON.parse(rawBody);
      return { valid: Boolean(escrowId && event), escrowId, event };
    } catch {
      return { valid: false };
    }
  }
}

describe("EscrowProvider (fake) — create, fund, verify, idempotent fulfil", () => {
  it("round-trips create -> fund -> webhook verify -> getTransaction", async () => {
    const provider = new FakeEscrowProvider();
    const created = await provider.createTransaction({
      orderRef: "ref-1",
      amountCents: 115_000,
      currency: "ZAR",
      buyer: { email: "b@test.io", name: "Jane" },
      seller: { id: "s1", payout: {} },
      itemDescription: "Hermès Birkin",
    });
    expect(created.escrowId).toMatch(/^esc_/);
    expect(created.payUrl).toContain(created.escrowId);

    provider.markFunded(created.escrowId);

    const verdict = provider.verifyWebhook(
      JSON.stringify({ escrowId: created.escrowId, event: "funded" }),
      new Headers(),
    );
    expect(verdict).toEqual({ valid: true, escrowId: created.escrowId, event: "funded" });

    const tx = await provider.getTransaction(created.escrowId);
    expect(tx.status).toBe("funded");
    expect(tx.orderRef).toBe("ref-1");
  });

  it("a rubbish webhook body does not verify", () => {
    const provider = new FakeEscrowProvider();
    expect(provider.verifyWebhook("not-json", new Headers()).valid).toBe(false);
  });

  it("idempotency: a duplicate funded webhook creates only ONE order (keyed on escrow_id)", async () => {
    const provider = new FakeEscrowProvider();
    const { escrowId } = await provider.createTransaction({
      orderRef: "ref-2",
      amountCents: 100_000,
      currency: "ZAR",
      buyer: { email: "b@test.io", name: "Jane" },
      seller: { id: "s1", payout: {} },
      itemDescription: "Chanel Flap",
    });
    provider.markFunded(escrowId);

    // Mimic fulfill_escrow_order's escrow_id idempotency guard with a Set.
    const ordersByEscrowId = new Set<string>();
    const fulfilOnce = (body: string): "created" | "duplicate" | "invalid" => {
      const v = provider.verifyWebhook(body, new Headers());
      if (!v.valid || !v.escrowId) return "invalid";
      if (ordersByEscrowId.has(v.escrowId)) return "duplicate";
      ordersByEscrowId.add(v.escrowId);
      return "created";
    };

    const body = JSON.stringify({ escrowId, event: "funded" });
    expect(fulfilOnce(body)).toBe("created");
    expect(fulfilOnce(body)).toBe("duplicate"); // provider retry — no second order
    expect(ordersByEscrowId.size).toBe(1);
  });
});
