"use client";

import { useState } from "react";

const PERIODS = [
  { key: "morning", label: "Manhã" },
  { key: "afternoon", label: "Tarde" },
  { key: "evening", label: "Noite" },
];
const dayFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" });

// O jogador marca os períodos (Manhã/Tarde/Noite) por dia em que NÃO pode jogar.
// Guarda em "unavailable" um array de "YYYY-MM-DD:period".
export function AvailabilityPicker({ days }: { days: string[] }) {
  const [off, setOff] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  if (days.length === 0) return null;

  return (
    <div>
      <input type="hidden" name="unavailable" value={JSON.stringify([...off])} />
      <p className="mb-2 text-xs text-soft">Marca os períodos em que <strong>não</strong> podes jogar. O calendário evita esses horários. Deixa em branco se estás sempre disponível.</p>
      <div className="space-y-2">
        {days.map((d) => (
          <div key={d} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2">
            <span className="text-sm font-medium capitalize text-zinc-800">{dayFmt.format(new Date(d + "T12:00:00Z"))}</span>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => {
                const k = `${d}:${p.key}`;
                const on = off.has(k);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggle(k)}
                    aria-pressed={on}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${on ? "bg-danger-bg text-danger ring-1 ring-danger/30" : "border border-line text-muted hover:bg-surface-soft"}`}
                  >
                    {on ? "✕ " : ""}{p.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
