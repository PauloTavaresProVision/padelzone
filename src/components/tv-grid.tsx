"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type Cell = {
  id: number;
  courtId: number;
  tk: string;
  cat: string;
  section: string;
  nameA: string;
  nameB: string;
  status: string;
  sets: { a: number; b: number }[] | null;
  winner: string | null;
};
type Court = { id: number; name: string };

const MAX_COLS = 4; // máximo de campos por página (legibilidade na TV)
const ROTATE_MS = 15000;

// Cor própria por categoria (tom claro), para distinguir num relance.
function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function players(name: string) {
  return name.split(" / ");
}

function Team({ names, scores, winner, dim }: { names: string[]; scores: number[] | null; winner: boolean; dim: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        {names.map((p, i) => (
          <p key={i} className={`truncate text-[16px] leading-tight ${winner ? "font-extrabold text-zinc-900" : dim ? "font-medium text-zinc-400" : "font-semibold text-zinc-800"}`}>{p}</p>
        ))}
      </div>
      {scores && scores.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {scores.map((n, i) => (
            <span key={i} className={`grid size-8 place-items-center rounded-md font-mono text-lg font-extrabold ${winner ? "bg-brand-purple text-white" : "bg-zinc-100 text-zinc-400"}`}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ g }: { g: Cell }) {
  const live = g.status === "LIVE";
  const done = g.status === "DONE";
  const h = hue(g.cat);
  return (
    <div className={`flex h-full flex-col justify-center overflow-hidden rounded-xl border px-2.5 py-2 ${live ? "border-brand-purple/40 bg-primary-light shadow-[0_0_0_1px_rgba(91,61,245,0.18)]" : "border-line bg-surface pz-shadow-card"}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: `hsl(${h} 78% 94%)`, color: `hsl(${h} 55% 38%)` }}>{g.cat} · {g.section}</span>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> A jogar
          </span>
        )}
        {done && <span className="shrink-0 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase text-white">Terminado</span>}
      </div>
      <Team names={players(g.nameA)} scores={done ? g.sets?.map((s) => s.a) ?? null : null} winner={done && g.winner === "A"} dim={done && g.winner !== "A"} />
      <div className="my-1 h-px bg-zinc-200" />
      <Team names={players(g.nameB)} scores={done ? g.sets?.map((s) => s.b) ?? null : null} winner={done && g.winner === "B"} dim={done && g.winner !== "B"} />
    </div>
  );
}

export function TvGrid({ courts, times, cells, currentKey }: { courts: Court[]; times: string[]; cells: Cell[]; currentKey: string | null }) {
  // Páginas de campos equilibradas (ex.: 8 campos -> 4+4, não 6+2).
  const { pages, per } = useMemo(() => {
    const count = Math.max(1, Math.ceil(courts.length / MAX_COLS));
    const per = Math.ceil(courts.length / count);
    const pages: Court[][] = [];
    for (let i = 0; i < courts.length; i += per) pages.push(courts.slice(i, i + per));
    return { pages, per };
  }, [courts]);

  const [p, setP] = useState(0);
  useEffect(() => {
    if (pages.length <= 1) return;
    const t = setInterval(() => setP((x) => (x + 1) % pages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [pages.length]);

  const idx = Math.min(p, pages.length - 1);
  const page = pages[idx] ?? [];
  const first = idx * per;
  const cell = (courtId: number, tk: string) => cells.find((c) => c.courtId === courtId && c.tk === tk);

  return (
    <div className="flex h-full flex-col gap-2">
      {pages.length > 1 && (
        <div className="flex shrink-0 items-center justify-end gap-2 text-sm font-semibold text-muted">
          Campos {first + 1}-{first + page.length} de {courts.length}
          <span className="flex gap-1">
            {pages.map((_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === idx ? "bg-brand-purple" : "bg-zinc-300"}`} />
            ))}
          </span>
        </div>
      )}

      <div
        className="grid min-h-0 flex-1 gap-2"
        style={{
          gridTemplateColumns: `5rem repeat(${page.length}, minmax(0,1fr))`,
          gridTemplateRows: `auto repeat(${times.length}, minmax(0,1fr))`,
        }}
      >
        <div />
        {page.map((c) => (
          <div key={c.id} className="pz-shadow-card flex items-center justify-center rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-2xl font-extrabold text-zinc-900">
            <span className="truncate">{c.name}</span>
          </div>
        ))}

        {times.map((tk) => (
          <Fragment key={tk}>
            <div className={`flex items-center justify-center text-3xl font-extrabold ${tk === currentKey ? "text-brand-purple" : "text-zinc-500"}`}>{tk}</div>
            {page.map((c) => {
              const g = cell(c.id, tk);
              return (
                <div key={c.id} className="min-h-0 overflow-hidden">
                  {g ? <Card g={g} /> : <div className="h-full rounded-xl border border-dashed border-zinc-200/70" />}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
