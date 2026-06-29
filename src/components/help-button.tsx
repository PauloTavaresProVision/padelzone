"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export type HelpItem = { label: string; desc: string; bullets?: string[] };

export function HelpButton({ title = "Como funciona esta página", items }: { title?: string; items: HelpItem[] }) {
  const [open, setOpen] = useState(false);
  const has = items && items.length > 0;

  return (
    <>
      <button
        onClick={() => has && setOpen(true)}
        aria-label="Ajuda"
        title="Ajuda"
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface-soft hover:text-brand-purple"
      >
        <HelpCircle className="size-[18px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="pz-shadow-card max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900">
                <HelpCircle className="size-5 text-brand-purple" /> {title}
              </h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-soft">
                <X className="size-5" />
              </button>
            </div>
            <ul className="space-y-2.5">
              {items.map((it, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface-soft/40 p-3">
                  <p className="text-sm font-semibold text-zinc-900">{it.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{it.desc}</p>
                  {it.bullets && it.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {it.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-sm leading-relaxed text-muted">
                          <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-purple/60" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
