import { describe, it, expect } from "vitest";
import { safeInternalRedirect } from "@/lib/auth/safe-redirect";

describe("safeInternalRedirect", () => {
  it("accepts internal paths (incl. query strings)", () => {
    expect(safeInternalRedirect("/buyer")).toBe("/buyer");
    expect(safeInternalRedirect("/buyer/orders/123")).toBe("/buyer/orders/123");
    expect(safeInternalRedirect("/browse?q=rolex&sort=price-asc")).toBe(
      "/browse?q=rolex&sort=price-asc",
    );
  });

  it("rejects protocol-relative open redirects (AUTH-1)", () => {
    expect(safeInternalRedirect("//evil.com")).toBeNull();
    expect(safeInternalRedirect("//evil.com/path")).toBeNull();
  });

  it("rejects backslash bypasses browsers resolve off-site (AUTH-5)", () => {
    expect(safeInternalRedirect("/\\evil.com")).toBeNull();
    expect(safeInternalRedirect("\\/evil.com")).toBeNull();
    expect(safeInternalRedirect("/\\/evil.com")).toBeNull();
  });

  it("rejects absolute URLs and scheme tricks", () => {
    expect(safeInternalRedirect("https://evil.com")).toBeNull();
    expect(safeInternalRedirect("http://evil.com")).toBeNull();
    expect(safeInternalRedirect("javascript:alert(1)")).toBeNull();
    expect(safeInternalRedirect("evil.com")).toBeNull();
  });

  it("rejects empty / non-string values", () => {
    expect(safeInternalRedirect("")).toBeNull();
    expect(safeInternalRedirect(null)).toBeNull();
    expect(safeInternalRedirect(undefined)).toBeNull();
    expect(safeInternalRedirect(123)).toBeNull();
  });
});
