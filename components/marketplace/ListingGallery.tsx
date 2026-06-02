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
      <div className="mb-4 aspect-[4/5] overflow-hidden rounded-[3px] border border-border-soft bg-card">
        {main ? (
          <Image
            src={main}
            alt={alt}
            width={900}
            height={1125}
            priority
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-dim">
            <CertificateIcon width={48} height={48} />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3.5">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-square overflow-hidden rounded-[3px] border bg-card transition-colors ${
                i === active ? "border-gold" : "border-border-soft hover:border-gold"
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
