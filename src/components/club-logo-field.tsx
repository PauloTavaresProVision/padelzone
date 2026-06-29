"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

export function ClubLogoField({ currentUrl, clubName }: { currentUrl: string | null; clubName: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const src = preview ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={clubName} className="size-full object-contain p-1" />
        ) : (
          <span className="text-lg font-bold text-soft">{clubName.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">
          <ImagePlus className="size-4" /> {currentUrl ? "Mudar logótipo" : "Escolher logótipo"}
          <input
            type="file"
            name="logo"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <p className="mt-1.5 text-xs text-soft">PNG ou JPG, até 8 MB. Guarda no fim para aplicar.</p>
      </div>
    </div>
  );
}
