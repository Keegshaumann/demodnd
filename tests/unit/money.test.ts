import { describe, it, expect } from "vitest";
import {
  splitCommission,
  formatZar,
  randsToCents,
  formatBps,
} from "@/lib/money";

// strip every whitespace kind (en-ZA uses a non-breaking space group separator)
const ws = (s: string) => s.replace(/\s/g, "");

describe("splitCommission", () => {
  it("splits a gross sale so commission + payout sum back to gross", () => {
    const { commissionCents, sellerPayoutCents } = splitCommission(18500000, 1200);
    expect(commissionCents).toBe(2220000); // 12% of 18,500,000
    expect(sellerPayoutCents).toBe(16280000);
    expect(commissionCents + sellerPayoutCents).toBe(18500000);
  });

  it("rounds commission to the nearest cent and keeps payout exact (no leak)", () => {
    // 333 * 1500 / 10000 = 49.95 → 50
    const { commissionCents, sellerPayoutCents } = splitCommission(333, 1500);
    expect(commissionCents).toBe(50);
    expect(sellerPayoutCents).toBe(283);
    expect(commissionCents + sellerPayoutCents).toBe(333);
  });

  it("handles the 0% and 100% edges", () => {
    expect(splitCommission(1000, 0)).toEqual({
      commissionCents: 0,
      sellerPayoutCents: 1000,
    });
    expect(splitCommission(1000, 10000)).toEqual({
      commissionCents: 1000,
      sellerPayoutCents: 0,
    });
  });

  it("never leaks a cent across many gross/bps combinations", () => {
    for (const gross of [1, 99, 100, 12345, 9999999, 18500000]) {
      for (const bps of [0, 1, 300, 1200, 5000, 9999, 10000]) {
        const { commissionCents, sellerPayoutCents } = splitCommission(gross, bps);
        expect(commissionCents + sellerPayoutCents).toBe(gross);
        expect(commissionCents).toBeGreaterThanOrEqual(0);
        expect(sellerPayoutCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("formatZar", () => {
  it("formats whole rands with space grouping and no comma", () => {
    expect(ws(formatZar(28500000))).toBe("R285000");
  });

  it("formats with decimals using a comma decimal separator", () => {
    expect(ws(formatZar(28500050, { withDecimals: true }))).toBe("R285000,50");
  });

  it("guards non-finite input instead of rendering 'R NaN'", () => {
    expect(formatZar(NaN)).toBe("R 0");
    expect(formatZar(Infinity)).toBe("R 0");
    // @ts-expect-error — runtime guard against an undefined slipping through
    expect(formatZar(undefined)).toBe("R 0");
  });
});

describe("randsToCents", () => {
  it("converts rands to integer cents, rounding", () => {
    expect(randsToCents(285000)).toBe(28500000);
    expect(randsToCents(10.005)).toBe(1001);
  });
});

describe("formatBps", () => {
  it("renders whole and fractional percentages", () => {
    expect(formatBps(1200)).toBe("12%");
    expect(formatBps(850)).toBe("8.5%");
    expect(formatBps(0)).toBe("0%");
  });
});
