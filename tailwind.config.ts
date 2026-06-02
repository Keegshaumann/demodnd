import type { Config } from "tailwindcss";

/**
 * D&D Luxury design tokens — lifted verbatim from the static demo (style.css :root).
 * Keep this in lockstep with the demo so every page stays in the same visual family.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F8F8F8",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        deep: "#EFEFEF",
        border: "#E5E5E5",
        "border-soft": "#EFEFEF",
        gold: "#0D0D0D",
        "gold-soft": "#1A1A1A",
        "gold-bright": "#000000",
        silver: "#777777",
        "silver-bright": "#888888",
        ink: "#1A1A1A",
        "ink-muted": "#555555",
        "ink-dim": "#888888",
      },
      fontFamily: {
        serif: [
          "var(--font-cormorant)",
          "Cormorant Garamond",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
        sans: [
          "var(--font-raleway)",
          "Raleway",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "3px",
      },
      boxShadow: {
        sm: "0 4px 16px rgba(0, 0, 0, 0.08)",
        md: "0 12px 32px rgba(0, 0, 0, 0.12)",
        lg: "0 20px 48px rgba(0, 0, 0, 0.16)",
      },
      letterSpacing: {
        eyebrow: "0.32em",
        wide2: "0.22em",
        wide3: "0.18em",
      },
      maxWidth: {
        container: "1320px",
      },
      transitionTimingFunction: {
        "ease-out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
