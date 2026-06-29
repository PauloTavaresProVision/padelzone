"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Pagination, usePagination } from "./pagination";

export type RankRow = { id: number; rank: number; name: string; points: number; city: string | null; levelName: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export function RankingList({ rows }: { rows: RankRow[] }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => !q || norm(`${r.name} ${r.city ?? ""}`).includes(norm(q)));
  const pag = usePagination(filtered, 20, q);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar jogador…"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">Nenhum jogador encontrado.</p>
      ) : (
        <div className="pz-shadow-card divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {pag.pageItems.map((r) => {
            const podium = r.rank <= 3;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:px-4">
                <span className={`w-9 shrink-0 text-center text-sm font-bold tabular-nums ${podium ? "text-brand-purple" : "text-soft"}`}>#{r.rank}</span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">{initials(r.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{r.name}</p>
                  <p className="truncate text-xs text-muted">{r.levelName}{r.city ? ` · ${r.city}` : ""}</p>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-zinc-900">
                  {r.points} <span className="text-xs font-normal text-soft">pts</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={pag.page} pageCount={pag.pageCount} total={pag.total} from={pag.from} to={pag.to} onPage={pag.setPage} />
    </div>
  );
}
