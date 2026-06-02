import type { MetadataRoute } from "next";
import { getActiveListings } from "@/lib/marketplace/listings";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/browse`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/concierge`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sell`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/signin`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Active listings (best-effort — returns [] if the DB isn't reachable).
  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const listings = await getActiveListings({ sort: "featured" });
    listingRoutes = listings.map((l) => ({
      url: `${base}/listing/${l.id}`,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    listingRoutes = [];
  }

  return [...staticRoutes, ...listingRoutes];
}
