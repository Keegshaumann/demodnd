"use client";

import { useState } from "react";
import Image from "next/image";
import { CertificateIcon } from "@/components/ui/icons";

export function ListingGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div>
      <div className="group relative mb-4 aspect-[4/5] overflow-hidden rounded-[3px] border border-border-soft bg-card">
        {main ? (
          <Image
            src={main}
            alt={alt}
            width={1000}
            height={1250}
            priority
            className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={48} height={48} />
          </div>
        )}
        <span className="pill pill-glass absolute left-4 top-4">
          <CertificateIcon width={11} height={11} /> Authenticated
        </span>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`aspect-square overflow-hidden rounded-[3px] border bg-card transition-all duration-300 ${
                i === active
                  ? "border-gold ring-1 ring-gold"
                  : "border-border-soft opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt={`${alt} view ${i + 1}`}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
