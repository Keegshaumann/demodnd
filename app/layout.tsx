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

export const metadata: Metadata = {
  title: {
    default: "D&D Luxury — South Africa's Authenticated Luxury Marketplace",
    template: "%s — D&D Luxury",
  },
  description:
    "Buy authenticated luxury — Hermès, Rolex, Cartier, Chanel and more — with full provenance, insurance and white-glove handling.",
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
