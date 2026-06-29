"use client";

import { useState } from "react";
import { Search, MapPin, Clock } from "lucide-react";
import { scheduleMatch } from "@/server/actions/schedule";

export type SchedGame = {
  id: number;
  section: string;
  sectionOrder: number;
  cat: string;
  color: { border: string; bg: string; text: string };
  nameA: string;
  nameB: string;
  courtId: number | null;
  courtName: string | null;
  whenValue: string; // "YYYY-MM-DDTHH:mm" ou ""
  whenLabel: string | null;
};

type Court = { id: number; name: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const field =
  "rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-brand-purple focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export function ScheduleBoard({ games, courts }: { games: SchedGame[]; courts: Court[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "done" | "all">("pending");

  const pendingCount = games.filter((g) => !g.whenValue).length;
  const doneCount = games.filter((g) => g.whenValue).length;

  const filtered = games.filter((g) => {
    if (tab === "pending" && g.whenValue) return false;
    if (tab === "done" && !g.whenValue) return false;
    if (q && !norm(`${g.nameA} ${g.nameB} ${g.courtName ?? ""}`).includes(norm(q))) return false;
    return true;
  });

  // Agendados → agrupa por campo; restantes → por secção (grupo/ronda)
  const groups = new Map<string, { order: number; games: SchedGame[] }>();
  for (const g of filtered) {
    const key = tab === "done" ? g.courtName ?? "Sem campo" : g.section;
    const order = tab === "done" ? 0 : g.sectionOrder;
    const s = groups.get(key) ?? { order, games: [] };
    s.games.push(g);
    groups.set(key, s);
  }
  const ordered = [...groups.entries()].sort((a, b) =>
    tab === "done" ? a[0].localeCompare(b[0]) : a[1].order - b[1].order
  );
  if (tab === "done") {
    for (const [, s] of ordered) s.games.sort((a, b) => a.whenValue.localeCompare(b.whenValue));
  }

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: "pending", label: "Por agendar", count: pendingCount },
    { key: "done", label: "Agendados", count: doneCount },
    { key: "all", label: "Todos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar dupla ou campo…"
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
                tab === t.key
                  ? "bg-white text-brand-purple shadow-sm dark:bg-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              {t.label}
              {t.count != null && <span className="ml-1.5 text-xs text-zinc-400">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {courts.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          Este clube ainda não tem campos. Adiciona-os no clube (Campos) para os poderes atribuir.
        </p>
      )}

      {ordered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
          {tab === "pending" ? "Tudo agendado por aqui." : "Nenhum jogo encontrado."}
        </p>
      ) : (
        ordered.map(([name, { games }]) => (
          <div key={name}>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {tab === "done" && <MapPin className="size-3.5" />} {name}
            </h3>
            <div className="space-y-2">
              {games.map((g) => (
                <GameRow key={g.id} g={g} courts={courts} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function GameRow({ g, courts }: { g: SchedGame; courts: Court[] }) {
  return (
    <form
      action={scheduleMatch}
      style={{ borderLeftColor: g.color.border }}
      className="rounded-xl border border-l-[3px] border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="matchId" value={g.id} />
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ background: g.color.bg, color: g.color.text }}>{g.cat}</span>
          <span className="truncate">{g.nameA} <span className="mx-1 text-zinc-400">vs</span> {g.nameB}</span>
        </span>
        {g.whenLabel && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-purple/10 px-2 py-0.5 text-[11px] font-medium text-brand-purple">
            <Clock className="size-3" /> {g.whenLabel}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select name="courtId" defaultValue={g.courtId ?? ""} className={`${field} flex-1 min-w-[7rem]`}>
          <option value="">Sem campo</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input type="datetime-local" name="scheduledAt" defaultValue={g.whenValue} className={`${field} flex-1 min-w-[11rem]`} />
        <button type="submit" className="rounded-lg bg-brand-purple px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90">
          Guardar
        </button>
      </div>
    </form>
  );
}
