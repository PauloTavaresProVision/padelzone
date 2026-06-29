"use client";

import { useState, useTransition } from "react";
import { Search, Download, Trash2 } from "lucide-react";
import { setEntryStatus, setSeed, removeEntry } from "@/server/actions/entries";
import { Pagination, usePagination } from "./pagination";

export type Insc = { id: number; name: string; categoryId: number; category: string; status: string; seed: number | null };
type Cat = { id: number; code: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  CONFIRMED: { label: "Confirmada", cls: "bg-success-bg text-success" },
  WAITLIST: { label: "Lista de espera", cls: "bg-primary-light text-brand-purple" },
  WITHDRAWN: { label: "Retirada", cls: "bg-danger-bg text-danger" },
};
const ORDER = ["PENDING", "CONFIRMED", "WAITLIST", "WITHDRAWN"];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function InscriptionsManager({ rows, categories, exportHref }: { rows: Insc[]; categories: Cat[]; exportHref: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(0);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  const filtered = rows.filter(
    (r) => (!cat || r.categoryId === cat) && (!status || r.status === status) && (!q || norm(r.name).includes(norm(q))),
  );
  const pag = usePagination(filtered, 25, `${q}|${cat}|${status}`);

  const counts: Record<string, number> = { all: rows.length };
  for (const k of ORDER) counts[k] = rows.filter((r) => r.status === k).length;

  const changeStatus = (id: number, value: string) => {
    const fd = new FormData();
    fd.set("entryId", String(id));
    fd.set("status", value);
    start(() => setEntryStatus(fd));
  };
  const saveSeed = (id: number, value: string) => {
    const fd = new FormData();
    fd.set("entryId", String(id));
    fd.set("seed", value);
    start(() => setSeed(fd));
  };
  const remove = (id: number) => {
    if (!confirm("Remover esta inscrição?")) return;
    const fd = new FormData();
    fd.set("entryId", String(id));
    start(() => removeEntry(fd));
  };

  const pill = (key: string, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setStatus(key === "all" ? "" : key)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        (key === "all" ? status === "" : status === key) ? "pz-gradient text-white" : "bg-surface-soft text-muted hover:text-zinc-900"
      }`}
    >
      {label} <span className="text-xs opacity-80">{count}</span>
    </button>
  );

  return (
    <div className={`space-y-4 ${pending ? "opacity-70 transition" : ""}`}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar inscrição…"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(Number(e.target.value))}
            className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted focus:border-brand-purple focus:outline-none"
          >
            <option value={0}>Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </div>
        <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft">
          <Download className="size-4" /> Exportar CSV
        </a>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {pill("all", "Todas", counts.all)}
        {ORDER.map((k) => pill(k, STATUS[k].label, counts[k]))}
      </div>

      {/* Tabela */}
      <div className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft/60 text-left text-xs font-semibold uppercase tracking-wide text-soft">
                <th className="px-4 py-3">Inscrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Cabeça de série</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-soft">Nenhuma inscrição encontrada.</td>
                </tr>
              ) : (
                pag.pageItems.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.PENDING;
                  return (
                    <tr key={r.id} className="transition hover:bg-surface-soft/40">
                      <td className="px-4 py-3 font-medium text-zinc-900">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-brand-purple">{r.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple/40 ${st.cls}`}
                        >
                          {ORDER.map((k) => (
                            <option key={k} value={k}>{STATUS[k].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          defaultValue={r.seed ?? ""}
                          type="number"
                          min={1}
                          placeholder="—"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          onBlur={(e) => {
                            if ((e.target.value || "") !== String(r.seed ?? "")) saveSeed(r.id, e.target.value);
                          }}
                          className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-center text-sm focus:border-brand-purple focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => remove(r.id)}
                          aria-label="Remover inscrição"
                          className="inline-grid size-8 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
