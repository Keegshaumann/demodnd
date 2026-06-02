import { describe, it, expect } from "vitest";
import { roleCanAccess, matchProtected, ROLE_HOME } from "@/lib/auth/roles";

describe("roleCanAccess", () => {
  it("treats admin as a superuser for every area", () => {
    expect(roleCanAccess("admin", "buyer")).toBe(true);
    expect(roleCanAccess("admin", "seller")).toBe(true);
    expect(roleCanAccess("admin", "admin")).toBe(true);
  });

  it("only lets non-admins into their own area", () => {
    expect(roleCanAccess("buyer", "buyer")).toBe(true);
    expect(roleCanAccess("buyer", "seller")).toBe(false);
    expect(roleCanAccess("buyer", "admin")).toBe(false);
    expect(roleCanAccess("seller", "seller")).toBe(true);
    expect(roleCanAccess("seller", "buyer")).toBe(false);
    expect(roleCanAccess("seller", "admin")).toBe(false);
  });
});

describe("matchProtected", () => {
  it("gates the /admin and /buyer prefixes", () => {
    expect(matchProtected("/admin")?.role).toBe("admin");
    expect(matchProtected("/admin/users")?.role).toBe("admin");
    expect(matchProtected("/buyer/orders/123")?.role).toBe("buyer");
  });

  it("gates the seller dashboard but NOT public seller profiles", () => {
    expect(matchProtected("/seller")?.role).toBe("seller");
    expect(matchProtected("/seller/listings")?.role).toBe("seller");
    expect(matchProtected("/seller/subscription")?.role).toBe("seller");
    // public reputation profile — must stay open
    expect(matchProtected("/seller/verified-atelier")).toBeNull();
  });

  it("leaves public marketplace routes unprotected", () => {
    expect(matchProtected("/")).toBeNull();
    expect(matchProtected("/browse")).toBeNull();
    expect(matchProtected("/listing/abc")).toBeNull();
    expect(matchProtected("/concierge")).toBeNull();
  });
});

describe("ROLE_HOME", () => {
  it("maps each role to its dashboard", () => {
    expect(ROLE_HOME).toEqual({
      buyer: "/buyer",
      seller: "/seller",
      admin: "/admin",
    });
  });
});
