import type { Metadata } from "next";
import { Cormorant_Garamond, Raleway } from "next/font/google";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-raleway",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "D&D Luxury",
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description: "South Africa's authenticated luxury marketplace.",
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "D&D Luxury",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/browse?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "D&D Luxury — South Africa's Authenticated Luxury Marketplace",
    template: "%s — D&D Luxury",
  },
  description:
    "Buy authenticated luxury — Hermès, Rolex, Cartier, Chanel and more — with full provenance, insurance and white-glove handling.",
  applicationName: "D&D Luxury",
  icons: { icon: "/logo.svg", shortcut: "/logo.svg", apple: "/logo.svg" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "D&D Luxury",
    locale: "en_ZA",
    url: siteUrl,
    title: "D&D Luxury — South Africa's Authenticated Luxury Marketplace",
    description:
      "Buy authenticated luxury — Hermès, Rolex, Cartier, Chanel and more — fully authenticated, insured, and delivered by hand.",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D Luxury",
    description:
      "South Africa's authenticated luxury marketplace — every piece verified before it goes live.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${raleway.variable}`}>
      <body>
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
