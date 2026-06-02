import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/authenticated areas — and the seller dashboard sections, while
      // keeping public seller profiles (/seller/[username]) crawlable.
      disallow: [
        "/admin",
        "/buyer",
        "/api",
        "/checkout",
        "/seller/listings",
        "/seller/sales",
        "/seller/subscription",
        "/seller/profile",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
