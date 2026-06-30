"use client";

import { useActionState, useEffect, useState } from "react";
import { scheduleMatch } from "@/server/actions/schedule";

type Court = { id: number; name: string };
type Game = {
  id: number;
  cat: string;
  section: string;
  nameA: string;
  nameB: string;
  courtId: number | null;
  whenValue: string;
  timeRange: string;
  done: boolean;
};

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";

type CatColor = { border: string; bg: string; text: string };

// Em modo reduzido mostramos só o último nome de cada jogador, para caber no ecrã.
function shortPair(name: string): string {
  if (name === "—") return name;
  return name
    .split(/\s*[/&]\s*/)
    .map((p) => { const parts = p.trim().split(/\s+/); return parts[parts.length - 1] || p; })
    .join(" / ");
}

export function GridGame({ game, courts, color, compact = false }: { game: Game; courts: Court[]; color: CatColor; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const nameA = compact ? shortPair(game.nameA) : game.nameA;
  const nameB = compact ? shortPair(game.nameB) : game.nameB;
  const [ok, action, pending] = useActionState<boolean, FormData>(async (_prev, formData) => {
    await scheduleMatch(formData);
    return true;
  }, false);
  useEffect(() => {
    if (ok) setOpen(false);
  }, [ok]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ borderLeftColor: color.border, background: color.bg }}
        className={`block w-full rounded-lg border-l-[3px] text-left transition hover:shadow-sm hover:brightness-[0.97] ${compact ? "p-1" : "p-2"} ${game.done ? "ring-1 ring-success/50" : ""}`}
      >
        {!compact && (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-muted">{game.timeRange}</span>
              {game.done && <span className="rounded bg-success-bg px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-success">Terminado</span>}
            </div>
            <p className="text-[11px] font-bold" style={{ color: color.text }}>{game.cat} · {game.section}</p>
          </>
        )}
        <p className={`truncate ${compact ? "text-[10px] leading-snug text-zinc-700" : "text-xs text-zinc-800"}`}>{nameA}</p>
        <p className={`truncate ${compact ? "text-[10px] leading-snug text-zinc-700" : "text-xs text-zinc-800"}`}>{nameB}</p>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="pz-shadow-card w-full max-w-sm rounded-2xl border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: color.text }}>{game.cat} · {game.section}</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{game.nameA}</p>
            <p className="text-sm font-medium text-zinc-900">{game.nameB}</p>

            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="matchId" value={game.id} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Campo</label>
                <select name="courtId" defaultValue={game.courtId ?? ""} className={field}>
                  <option value="">Sem campo</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Dia e hora</label>
                <input type="datetime-local" name="scheduledAt" defaultValue={game.whenValue} className={field} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="pz-gradient rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-60">
                  {pending ? "A guardar…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
