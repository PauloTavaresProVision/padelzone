"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Tags, Shuffle, ListChecks, CalendarDays, Users, UsersRound, Settings, Clock, MapPin, ScrollText } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Rascunho", cls: "bg-surface-soft text-muted" },
  OPEN: { label: "Inscrições abertas", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-success-bg text-success" },
  FINISHED: { label: "Terminada", cls: "bg-surface-soft text-muted" },
  CANCELLED: { label: "Cancelada", cls: "bg-danger-bg text-danger" },
};

export function TournamentSidebar({
  id,
  name,
  status,
  dateLabel,
  location,
  progress,
}: {
  id: number;
  name: string;
  status: string;
  dateLabel: string;
  location: string;
  progress: number;
}) {
  const pathname = usePathname();
  const base = `/admin/torneios/${id}`;
  const items = [
    { href: base, label: "Visão geral", icon: LayoutDashboard, exact: true },
    { href: `${base}/inscricoes`, label: "Inscrições", icon: ClipboardList },
    { href: `${base}/categorias`, label: "Categorias", icon: Tags },
    { href: `${base}/sorteio`, label: "Sorteio", icon: Shuffle, also: `${base}/ao-vivo` },
    { href: `${base}/resultados`, label: "Resultados", icon: ListChecks },
    { href: `${base}/calendario`, label: "Calendário", icon: CalendarDays },
    { href: `${base}/jogadores`, label: "Jogadores", icon: Users },
    { href: `${base}/duplas`, label: "Duplas", icon: UsersRound },
    { href: `${base}/regulamento`, label: "Regulamento", icon: ScrollText },
    { href: `${base}/definicoes`, label: "Definições", icon: Settings },
  ];
  const isActive = (it: (typeof items)[number]) =>
    it.exact ? pathname === it.href : pathname.startsWith(it.href) || (it.also ? pathname.startsWith(it.also) : false);
  const st = STATUS[status] ?? STATUS.DRAFT;

  return (
    <>
      {/* Desktop — painel de altura completa */}
      <aside className="hidden h-full flex-col gap-4 border-r border-line bg-surface p-5 lg:flex">
        <Link href="/admin" className="flex justify-center pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-12 w-auto" />
        </Link>

        <div className="pz-shadow-soft rounded-[18px] border border-line bg-surface p-4">
          <p className="truncate text-sm font-bold text-zinc-900">{name}</p>
          <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
          {dateLabel && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
              <Clock className="size-3.5 text-soft" /> {dateLabel}
            </p>
          )}
          {location && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="size-3.5 text-soft" /> {location}
            </p>
          )}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Progresso do torneio</span>
              <span className="font-bold text-zinc-700">{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft">
              <div className="pz-gradient h-full rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {items.map((it) => {
            const a = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                  a ? "pz-gradient pz-shadow-soft text-white" : "text-muted hover:bg-surface-soft"
                }`}
              >
                <it.icon className="size-[18px]" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile */}
      <div className="border-b border-line bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-bold text-zinc-900">{name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <nav className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((it) => {
            const a = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                  a ? "pz-gradient text-white" : "bg-surface-soft text-muted"
                }`}
              >
                <it.icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
