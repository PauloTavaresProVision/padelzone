"use client";

import { useState } from "react";
import { Tv, Globe, Copy, Check } from "lucide-react";

export function CalendarTvButtons({ compId }: { compId: number }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/public/tournaments/${compId}/schedule-tv`;
  const pageUrl = () => `${window.location.origin}/public/tournaments/${compId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => window.open(pageUrl(), "_blank")}
        className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-muted shadow-sm ring-1 ring-line transition hover:bg-surface-soft"
      >
        <Globe className="size-4" /> Página pública
      </button>
      <button
        onClick={() => window.open(url(), "_blank")}
        className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-muted shadow-sm ring-1 ring-line transition hover:bg-surface-soft"
      >
        <Tv className="size-4" /> Abrir Modo TV
      </button>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-muted shadow-sm ring-1 ring-line transition hover:bg-surface-soft"
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} {copied ? "Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
