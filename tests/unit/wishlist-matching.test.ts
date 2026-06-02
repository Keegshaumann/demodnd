import { describe, it, expect } from "vitest";
import {
  fold,
  wishlistMatches,
  type MatchableListing,
} from "@/lib/wishlist/matching";
import type { Wishlist } from "@/lib/supabase/database.types";

function wl(p: Partial<Wishlist>): Wishlist {
  return {
    id: "w1",
    buyer_id: "b1",
    brand: null,
    category: null,
    keywords: null,
    max_price_cents: null,
    created_at: "2026-01-01T00:00:00Z",
    ...p,
  };
}

const rolex: MatchableListing = {
  brand: "Rolex",
  category: "watches",
  title: "Rolex Submariner Date",
  model: "126610LN",
  description: "Oystersteel, box and papers",
  price_cents: 18500000,
};

const birkin: MatchableListing = {
  brand: "Hermès",
  category: "bags",
  title: "Hermes Birkin 30",
  model: "Birkin 30",
  description: "Togo leather, palladium hardware",
  price_cents: 42500000,
};

describe("fold", () => {
  it("lowercases and strips diacritics", () => {
    expect(fold("Hermès")).toBe("hermes");
    expect(fold("  Bvlgari ")).toBe("bvlgari");
  });
});

describe("wishlistMatches", () => {
  it("never matches an all-empty wishlist", () => {
    expect(wishlistMatches(wl({}), rolex)).toBe(false);
  });

  it("matches brand case- and accent-insensitively (BUY-5)", () => {
    expect(wishlistMatches(wl({ brand: "hermes" }), birkin)).toBe(true);
    expect(wishlistMatches(wl({ brand: "Hermès" }), birkin)).toBe(true);
    expect(wishlistMatches(wl({ brand: "Rolex" }), birkin)).toBe(false);
  });

  it("matches a keyword that lives only in the model field (BUY-2)", () => {
    const modelOnly: MatchableListing = {
      ...birkin,
      title: "Noir handbag",
      description: "an elegant piece",
    };
    expect(wishlistMatches(wl({ keywords: "birkin" }), modelOnly)).toBe(true);
  });

  it("requires every keyword token to appear (AND semantics)", () => {
    expect(wishlistMatches(wl({ keywords: "submariner date" }), rolex)).toBe(true);
    expect(wishlistMatches(wl({ keywords: "submariner gold" }), rolex)).toBe(false);
  });

  it("respects category and max price", () => {
    expect(wishlistMatches(wl({ category: "watches" }), rolex)).toBe(true);
    expect(wishlistMatches(wl({ category: "bags" }), rolex)).toBe(false);
    expect(
      wishlistMatches(wl({ category: "watches", max_price_cents: 10000000 }), rolex),
    ).toBe(false);
    expect(
      wishlistMatches(wl({ category: "watches", max_price_cents: 20000000 }), rolex),
    ).toBe(true);
  });

  it("combines all criteria together", () => {
    expect(
      wishlistMatches(
        wl({ brand: "Rolex", keywords: "submariner", max_price_cents: 20000000 }),
        rolex,
      ),
    ).toBe(true);
    expect(wishlistMatches(wl({ brand: "Rolex", keywords: "daytona" }), rolex)).toBe(
      false,
    );
  });
});
