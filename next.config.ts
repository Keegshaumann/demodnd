import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project — a stray lockfile in the home dir
  // otherwise makes Next infer the wrong root for output file tracing.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  images: {
    remotePatterns: [
      // Demo/reference imagery
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (item photos, certificates)
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname }]
        : []),
    ],
  },
  typescript: {
    // Build fails on type errors — we want strict enforcement.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
