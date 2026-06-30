"use client";

import { useEffect, useMemo, useState } from "react";

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

const PAGE = 6;
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
          <p key={i} className={`truncate text-[15px] leading-tight ${winner ? "font-extrabold text-zinc-900" : dim ? "font-medium text-zinc-400" : "font-semibold text-zinc-800"}`}>{p}</p>
        ))}
      </div>
      {scores && scores.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {scores.map((n, i) => (
            <span key={i} className={`grid size-7 place-items-center rounded-md font-mono text-base font-extrabold ${winner ? "bg-brand-purple text-white" : "bg-zinc-100 text-zinc-400"}`}>{n}</span>
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
    <div className={`rounded-xl border p-2.5 ${live ? "border-brand-purple/40 bg-primary-light shadow-[0_0_0_1px_rgba(91,61,245,0.18)]" : "border-line bg-surface pz-shadow-card"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: `hsl(${h} 78% 94%)`, color: `hsl(${h} 55% 38%)` }}>{g.cat} · {g.section}</span>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> A jogar
          </span>
        )}
        {done && <span className="shrink-0 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase text-white">Terminado</span>}
      </div>
      <Team names={players(g.nameA)} scores={done ? g.sets?.map((s) => s.a) ?? null : null} winner={done && g.winner === "A"} dim={done && g.winner !== "A"} />
      <div className="my-1.5 h-px bg-zinc-200" />
      <Team names={players(g.nameB)} scores={done ? g.sets?.map((s) => s.b) ?? null : null} winner={done && g.winner === "B"} dim={done && g.winner !== "B"} />
    </div>
  );
}

export function TvGrid({ courts, times, cells, currentKey }: { courts: Court[]; times: string[]; cells: Cell[]; currentKey: string | null }) {
  const pages = useMemo(() => {
    const out: Court[][] = [];
    for (let i = 0; i < courts.length; i += PAGE) out.push(courts.slice(i, i + PAGE));
    return out;
  }, [courts]);

  const [p, setP] = useState(0);
  useEffect(() => {
    if (pages.length <= 1) return;
    const t = setInterval(() => setP((x) => (x + 1) % pages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [pages.length]);

  const idx = Math.min(p, pages.length - 1);
  const page = pages[idx] ?? [];
  const first = idx * PAGE;
  const cell = (courtId: number, tk: string) => cells.find((c) => c.courtId === courtId && c.tk === tk);

  return (
    <div className="flex h-full flex-col">
      {pages.length > 1 && (
        <div className="mb-2 flex items-center justify-end gap-2 text-sm font-semibold text-muted">
          Campos {first + 1}-{first + page.length} de {courts.length}
          <span className="flex gap-1">
            {pages.map((_, i) => (
              <span key={i} className={`size-2 rounded-full ${i === idx ? "bg-brand-purple" : "bg-zinc-300"}`} />
            ))}
          </span>
        </div>
      )}
      <table className="w-full border-separate" style={{ borderSpacing: "8px" }}>
        <thead>
          <tr>
            <th className="w-16" />
            {page.map((c) => (
              <th key={c.id} className="rounded-lg border border-line bg-surface px-2 py-2 text-center text-lg font-extrabold text-zinc-900 pz-shadow-card">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((tk) => (
            <tr key={tk}>
              <td className={`text-center align-middle text-xl font-extrabold ${tk === currentKey ? "text-brand-purple" : "text-zinc-500"}`}>{tk}</td>
              {page.map((c) => {
                const g = cell(c.id, tk);
                return (
                  <td key={c.id} className="align-top">
                    {g ? <Card g={g} /> : <div className="h-full min-h-[60px] rounded-xl border border-dashed border-zinc-200" />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
