"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Bell, HelpCircle, Plus, Trophy, Check, ClipboardList, Shuffle, CalendarDays, ListChecks } from "lucide-react";

type Comp = { id: number; name: string };

export function TournamentTopbar({
  currentId,
  currentName,
  competitions,
}: {
  currentId: number;
  currentName: string;
  competitions: Comp[];
}) {
  const [sel, setSel] = useState(false);
  const [act, setAct] = useState(false);
  const base = `/admin/torneios/${currentId}`;
  const actions = [
    { href: `${base}/inscricoes`, label: "Gerir inscrições", icon: ClipboardList },
    { href: `${base}/sorteio`, label: "Sorteio", icon: Shuffle },
    { href: `${base}/calendario`, label: "Calendário", icon: CalendarDays },
    { href: `${base}/resultados`, label: "Resultados", icon: ListChecks },
  ];

  return (
    <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
      {/* Seletor de torneio */}
      <div className="relative">
        <button
          onClick={() => { setSel((s) => !s); setAct(false); }}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Trophy className="size-4 text-brand-purple" />
          <span className="max-w-[180px] truncate">{currentName}</span>
          <ChevronDown className="size-4 text-zinc-400" />
        </button>
        {sel && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSel(false)} />
            <div className="absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Mudar de torneio</p>
              {competitions.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/torneios/${c.id}`}
                  onClick={() => setSel(false)}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === currentId && <Check className="size-4 shrink-0 text-brand-purple" />}
                </Link>
              ))}
              <Link
                href="/admin/torneios"
                onClick={() => setSel(false)}
                className="mt-1 block border-t border-zinc-100 px-3 py-2 text-sm font-medium text-brand-purple dark:border-zinc-800"
              >
                Ver todos os torneios
              </Link>
            </div>
          </>
        )}
      </div>

      <button className="grid size-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" aria-label="Notificações">
        <Bell className="size-4" />
      </button>
      <button className="grid size-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" aria-label="Ajuda">
        <HelpCircle className="size-4" />
      </button>

      {/* Ação rápida */}
      <div className="relative">
        <button
          onClick={() => { setAct((a) => !a); setSel(false); }}
          className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="size-4" /> Ação rápida <ChevronDown className="size-4" />
        </button>
        {act && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAct(false)} />
            <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setAct(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <a.icon className="size-4 text-zinc-400" /> {a.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
