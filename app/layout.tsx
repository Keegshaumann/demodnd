import type { Metadata } from "next";
import { Cormorant_Garamond, Raleway } from "next/font/google";
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
      <body>{children}</body>
    </html>
  );
}
