"use client";

import { useEffect, useRef } from "react";

const ICONS = [
  "icon-hermes.svg",
  "icon-chanel.svg",
  "icon-lv.svg",
  "icon-rolex.svg",
  "icon-gucci.svg",
  "icon-cartier.svg",
  "icon-dior.svg",
  "icon-prada.svg",
  "icon-bv.svg",
  "icon-valentino.svg",
  "icon-bulgari.svg",
  "icon-breitling.svg",
];

const CELL = 170;

/**
 * Decorative X-grid + scattered maison icons behind the hero. Ported from the
 * demo's inline script. Purely cosmetic, pointer-events: none.
 */
export function HeroDeco() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const deco = ref.current;
    const hero = deco?.parentElement;
    if (!deco || !hero) return;

    function build() {
      if (!deco || !hero) return;
      // Clear previous icons (keep the vignette child).
      deco.querySelectorAll("img").forEach((n) => n.remove());

      const W = hero.offsetWidth;
      const H = hero.offsetHeight;
      const cols = Math.ceil(W / CELL) + 1;
      const rows = Math.ceil(H / CELL) + 1;
      const cx = W / 2;
      const cy = H / 2;

      const G = 20;
      const C = CELL;
      const svgTile =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='" +
        C +
        "' height='" +
        C +
        "'%3E%3Cline x1='" +
        G +
        "' y1='" +
        G +
        "' x2='" +
        (C - G) +
        "' y2='" +
        (C - G) +
        "' stroke='rgba(0,0,0,0.13)' stroke-width='0.8'/%3E%3Cline x1='" +
        (C - G) +
        "' y1='" +
        G +
        "' x2='" +
        G +
        "' y2='" +
        (C - G) +
        "' stroke='rgba(0,0,0,0.13)' stroke-width='0.8'/%3E%3C/svg%3E";
      deco.style.backgroundImage = `url("${svgTile}")`;
      deco.style.backgroundSize = `${CELL}px ${CELL}px`;
      deco.style.backgroundPosition = "0 0";

      let seed = 0;
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      };

      let idx = 0;
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const x = col * CELL;
          const y = row * CELL;
          const dx = (x - cx) / cx;
          const dy = (y - cy) / cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.45) {
            idx++;
            continue;
          }
          if (rng() > 0.72) {
            idx++;
            continue;
          }
          const img = document.createElement("img");
          img.src = `/brand/${ICONS[idx % ICONS.length]}`;
          img.alt = "";
          img.style.position = "absolute";
          img.style.width = "28px";
          img.style.height = "28px";
          img.style.objectFit = "contain";
          img.style.transform = "translate(-50%, -50%)";
          img.style.opacity = "0.28";
          img.style.filter = "grayscale(1) brightness(0)";
          img.style.left = `${x}px`;
          img.style.top = `${y}px`;
          deco.appendChild(img);
          idx++;
        }
      }
    }

    build();
    window.addEventListener("resize", build);
    return () => window.removeEventListener("resize", build);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 48% 55% at 50% 50%, rgba(248,248,248,0.98) 0%, rgba(248,248,248,0.93) 38%, rgba(248,248,248,0.55) 65%, transparent 100%)",
        }}
      />
    </div>
  );
}
