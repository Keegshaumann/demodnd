import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Allows: self, Supabase (DB/auth/storage + realtime
// ws), Unsplash + Supabase images. Checkout uses PayFast's hosted redirect
// flow — a top-level form POST to payfast.co.za — so the PayFast origins are
// allowed in `form-action` (not framed or fetched). 'unsafe-inline' is required
// for Next.js inline hydration scripts; 'unsafe-eval' is dev-only (HMR). A
// nonce-based CSP is a future hardening step.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za`,
  `frame-ancestors 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: `camera=(), microphone=(), geolocation=(), payment=(self)`,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
