import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { payfastSignature } from "@/lib/payfast/signature";

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

describe("payfastSignature", () => {
  it("hashes the ordered key=value string, encoding spaces as +", () => {
    const pairs: [string, string][] = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["amount", "100.00"],
      ["item_name", "Test Item"],
    ];
    // Built independently of the implementation:
    const expected = md5(
      "merchant_id=10000100&merchant_key=46f0cd694581a&amount=100.00&item_name=Test+Item",
    );
    expect(payfastSignature(pairs)).toBe(expected);
  });

  it("preserves field order (order is load-bearing)", () => {
    const a = payfastSignature([
      ["a", "1"],
      ["b", "2"],
    ]);
    const b = payfastSignature([
      ["b", "2"],
      ["a", "1"],
    ]);
    expect(a).not.toBe(b);
  });

  it("excludes blank values", () => {
    const sig = payfastSignature([
      ["a", "1"],
      ["b", ""],
      ["c", "3"],
    ]);
    expect(sig).toBe(md5("a=1&c=3"));
  });

  it("appends the passphrase when set, not when empty", () => {
    const pairs: [string, string][] = [["amount", "100.00"]];
    expect(payfastSignature(pairs, "S3cret Pass")).toBe(
      md5("amount=100.00&passphrase=S3cret+Pass"),
    );
    expect(payfastSignature(pairs, "")).toBe(md5("amount=100.00"));
    expect(payfastSignature(pairs)).toBe(md5("amount=100.00"));
  });

  it("trims values before encoding (matches PayFast PHP urlencode(trim()))", () => {
    expect(payfastSignature([["item_name", "  Padded  "]])).toBe(
      md5("item_name=Padded"),
    );
  });

  it("uppercase-percent-encodes reserved characters", () => {
    // '&' must be encoded so it can't inject a new field; PayFast/PHP → %26.
    expect(payfastSignature([["item_name", "A & B"]])).toBe(
      md5("item_name=A+%26+B"),
    );
  });
});
