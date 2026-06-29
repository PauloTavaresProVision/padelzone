"use client";

import { useState, useActionState } from "react";
import { Search, MapPin, CalendarClock, Clock, Trophy } from "lucide-react";
import { submitResult, type ResultState } from "@/server/actions/results";

export type Game = {
  id: number;
  cat: string;
  section: string;
  nameA: string;
  nameB: string;
  realA: boolean;
  realB: boolean;
  done: boolean;
  winner: "A" | "B" | null;
  sets: { a: number; b: number }[];
  courtName?: string | null;
  whenLabel?: string | null;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ResultsBoard({ games, categories }: { games: Game[]; categories: string[] }) {
  const [cat, setCat] = useState("Todas");
  const [tab, setTab] = useState<"pending" | "done" | "all">("pending");
  const [q, setQ] = useState("");

  const inCat = (g: Game) => cat === "Todas" || g.cat === cat;
  const playable = (g: Game) => g.realA && g.realB;
  const scoped = games.filter(inCat);
  const counts = {
    pending: scoped.filter((g) => playable(g) && !g.done).length,
    done: scoped.filter((g) => g.done).length,
    all: scoped.length,
  };
  const filtered = scoped.filter((g) => {
    if (tab === "pending" && !(playable(g) && !g.done)) return false;
    if (tab === "done" && !g.done) return false;
    if (q && !norm(`${g.nameA} ${g.nameB} ${g.cat}`).includes(norm(q))) return false;
    return true;
  });

  const tabs: { key: typeof tab; label: string; dot?: string; count: number }[] = [
    { key: "pending", label: "Por jogar", dot: "bg-brand-purple", count: counts.pending },
    { key: "done", label: "Terminados", dot: "bg-success", count: counts.done },
    { key: "all", label: "Todos", count: counts.all },
  ];

  return (
    <div className="space-y-4">
      {/* Pesquisa */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar dupla, jogador ou categoria…"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
        />
      </div>

      {/* Categorias (deslizável) */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {["Todas", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              cat === c ? "pz-gradient text-white" : "bg-surface text-muted hover:bg-surface-soft"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Estado */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
              tab === t.key ? "border-brand-purple/30 bg-primary-light text-brand-purple" : "border-line bg-surface text-muted hover:bg-surface-soft"
            }`}
          >
            {t.dot && <span className={`size-2 rounded-full ${t.dot}`} />}
            {t.label}
            <span className="text-soft">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Jogos */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-soft">
          {tab === "pending" ? "Não há jogos por jogar aqui." : "Nenhum jogo encontrado."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map((g) => (
            <GameCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ g }: { g: Game }) {
  const [state, action, pending] = useActionState<ResultState, FormData>(submitResult, null);
  const ready = g.realA && g.realB;
  const status = !ready
    ? { label: "Aguarda apuramento", dot: "bg-soft", cls: "bg-surface-soft text-soft" }
    : g.done
      ? { label: "Terminado", dot: "bg-success", cls: "bg-success-bg text-success" }
      : { label: "Por jogar", dot: "bg-brand-purple", cls: "bg-primary-light text-brand-purple" };

  const col = "grid grid-cols-[minmax(0,1fr)_repeat(3,2.75rem)] items-center gap-2";
  const setBox =
    "h-11 w-11 rounded-xl border-2 border-line bg-surface text-center text-lg font-bold tabular-nums focus:border-brand-purple focus:outline-none disabled:opacity-40";
  const nameCls = (win: boolean) => `flex min-w-0 items-center gap-1.5 truncate text-[15px] ${win ? "font-bold text-zinc-900" : "font-medium text-zinc-700"}`;

  return (
    <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-lg bg-primary-light px-2.5 py-1 text-xs font-bold text-brand-purple">{g.cat} · {g.section}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} /> {status.label}
        </span>
      </div>

      <form action={action}>
        <input type="hidden" name="matchId" value={g.id} />

        {ready && (
          <div className={`${col} mb-1.5`}>
            <span />
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                title={i === 3 ? "Set decisivo: super tie-break (ex.: 10-8)" : undefined}
                className="text-center text-[11px] font-medium leading-tight text-soft"
              >
                {i === 3 ? "Super TB" : `Set ${i}`}
              </span>
            ))}
          </div>
        )}

        {/* Dupla A */}
        <div className={col}>
          <span className={nameCls(g.winner === "A")}>
            {g.winner === "A" && <Trophy className="size-3.5 shrink-0 text-warning" />}
            <span className="truncate">{g.nameA}</span>
          </span>
          {[1, 2, 3].map((i) => (
            <input key={i} type="number" inputMode="numeric" min={0} name={`s${i}a`} defaultValue={g.sets[i - 1]?.a ?? ""} disabled={!ready} className={setBox} />
          ))}
        </div>

        {/* Dupla B */}
        <div className={`${col} mt-2`}>
          <span className={nameCls(g.winner === "B")}>
            {g.winner === "B" && <Trophy className="size-3.5 shrink-0 text-warning" />}
            <span className="truncate">{g.nameB}</span>
          </span>
          {[1, 2, 3].map((i) => (
            <input key={i} type="number" inputMode="numeric" min={0} name={`s${i}b`} defaultValue={g.sets[i - 1]?.b ?? ""} disabled={!ready} className={setBox} />
          ))}
        </div>

        {/* Rodapé */}
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {g.courtName && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-soft" /> {g.courtName}</span>}
            {g.whenLabel && <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-soft" /> {g.whenLabel}</span>}
            {!ready && <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> Aguarda jogos anteriores</span>}
          </div>
          {ready && (
            <button type="submit" disabled={pending} className="pz-gradient w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60 sm:w-auto">
              {pending ? "A guardar…" : g.done ? "Atualizar resultado" : "Guardar resultado"}
            </button>
          )}
        </div>
        {state?.error && <p className="mt-2 rounded-lg bg-danger-bg px-3 py-1.5 text-xs font-medium text-danger">{state.error}</p>}
        {state?.ok && <p className="mt-2 text-xs font-medium text-success">✓ Resultado guardado.</p>}
      </form>
    </div>
  );
}
