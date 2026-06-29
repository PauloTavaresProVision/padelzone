"use client";

import { useState } from "react";
import { Search, Download, UsersRound } from "lucide-react";
import { Pagination, usePagination } from "./pagination";

export type TeamRow = {
  id: number;
  p1: string;
  p2: string;
  category: string;
  tournament: string;
  seed: number | null;
  status: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  CONFIRMED: { label: "Confirmada", cls: "bg-success-bg text-success" },
  WAITLIST: { label: "Lista de espera", cls: "bg-surface-soft text-muted" },
  WITHDRAWN: { label: "Desistiu", cls: "bg-danger-bg text-danger" },
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const initials = (a: string, b: string) => ((a[0] ?? "") + (b[0] ?? "")).toUpperCase();

export function TeamsTable({ rows, categories, exportHref, showTournament = true }: { rows: TeamRow[]; categories: string[]; exportHref: string; showTournament?: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const filtered = rows.filter(
    (r) => (!cat || r.category === cat) && (!q || norm(`${r.p1} ${r.p2} ${r.category} ${r.tournament}`).includes(norm(q))),
  );
  const pag = usePagination(filtered, 25, `${q}|${cat}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar por jogador, categoria…"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted focus:border-brand-purple focus:outline-none"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-muted">{filtered.length} duplas</span>
          <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft">
            <Download className="size-4" /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft/60 text-left text-xs font-semibold uppercase tracking-wide text-soft">
                <th className="px-4 py-3">Dupla</th>
                <th className="px-4 py-3">Categoria</th>
                {showTournament && <th className="px-4 py-3">Torneio</th>}
                <th className="px-4 py-3 text-center">Cabeça de série</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showTournament ? 5 : 4} className="px-4 py-10 text-center text-sm text-soft">Nenhuma dupla encontrada.</td>
                </tr>
              ) : (
                pag.pageItems.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.PENDING;
                  return (
                    <tr key={r.id} className="transition hover:bg-surface-soft/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">
                            {initials(r.p1, r.p2) || <UsersRound className="size-4" />}
                          </span>
                          <span className="font-medium text-zinc-900">
                            {r.p1} <span className="text-soft">/</span> {r.p2}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-brand-purple">{r.category}</span>
                      </td>
                      {showTournament && <td className="whitespace-nowrap px-4 py-3 text-muted">{r.tournament}</td>}
                      <td className="px-4 py-3 text-center text-muted">{r.seed ? `#${r.seed}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pag.page} pageCount={pag.pageCount} total={pag.total} from={pag.from} to={pag.to} onPage={pag.setPage} />
    </div>
  );
}
