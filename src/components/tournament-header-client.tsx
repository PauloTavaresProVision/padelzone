"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Trophy, Check, PanelLeftClose, PanelLeftOpen, LogOut, ArrowLeft } from "lucide-react";
import { HelpButton, type HelpItem } from "./help-button";
import { useSidebarToggle } from "./sidebar-toggle-context";
import { logout } from "@/server/actions/auth";

type Comp = { id: number; name: string };

const initials = (n: string) => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export function TournamentHeaderClient({
  title,
  subtitle,
  currentId,
  currentName,
  competitions,
  help,
  userName,
}: {
  title: string;
  subtitle?: string;
  currentId: number;
  currentName: string;
  competitions: Comp[];
  help?: HelpItem[];
  userName: string;
}) {
  const [sel, setSel] = useState(false);
  const [usr, setUsr] = useState(false);
  const sb = useSidebarToggle();

  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        {sb && (
          <button
            onClick={sb.toggle}
            title={sb.collapsed ? "Mostrar menu" : "Esconder menu"}
            aria-label={sb.collapsed ? "Mostrar menu" : "Esconder menu"}
            className="mt-1 hidden size-9 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface-soft lg:inline-grid"
          >
            {sb.collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
        )}
        <div>
          <Link href="/admin" className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-brand-purple">
            <ArrowLeft className="size-3.5" /> Painel do clube
          </Link>
          <h1 className="text-[28px] font-bold leading-tight text-zinc-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Seletor de torneio */}
        <div className="relative">
          <button
            onClick={() => { setSel((s) => !s); setUsr(false); }}
            className="pz-shadow-soft flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft"
          >
            <Trophy className="size-4 text-brand-purple" />
            <span className="max-w-[170px] truncate">{currentName}</span>
            <ChevronDown className="size-4 text-soft" />
          </button>
          {sel && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSel(false)} />
              <div className="pz-shadow-card absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-line bg-surface py-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-soft">Mudar de torneio</p>
                {competitions.map((c) => (
                  <Link key={c.id} href={`/admin/torneios/${c.id}`} onClick={() => setSel(false)} className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-surface-soft">
                    <span className="truncate">{c.name}</span>
                    {c.id === currentId && <Check className="size-4 shrink-0 text-brand-purple" />}
                  </Link>
                ))}
                <Link href="/admin/torneios" onClick={() => setSel(false)} className="mt-1 block border-t border-line px-3 py-2 text-sm font-medium text-brand-purple">
                  Ver todos os torneios
                </Link>
              </div>
            </>
          )}
        </div>

        <HelpButton title={`Ajuda: ${title}`} items={help ?? []} />

        {/* Utilizador */}
        <div className="relative">
          <button
            onClick={() => { setUsr((u) => !u); setSel(false); }}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-2.5 transition hover:bg-surface-soft"
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">{initials(userName)}</span>
            <span className="hidden max-w-[120px] truncate text-sm font-semibold text-zinc-700 sm:inline">{userName}</span>
            <ChevronDown className="size-4 text-soft" />
          </button>
          {usr && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setUsr(false)} />
              <div className="pz-shadow-card absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-zinc-900">{userName}</p>
                  <p className="text-xs text-muted">Organizador</p>
                </div>
                <form action={logout} className="border-t border-line">
                  <button type="submit" className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">
                    <LogOut className="size-4" /> Sair
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
