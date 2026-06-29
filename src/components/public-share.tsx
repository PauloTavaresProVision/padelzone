"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

// Botão "Copiar link" para partilhar a página pública do torneio.
export function PublicShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft"
    >
      {copied ? <><Check className="size-4 text-success" /> Link copiado</> : <><Link2 className="size-4" /> Copiar link</>}
    </button>
  );
}
