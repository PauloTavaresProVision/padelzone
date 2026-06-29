"use client";

import { useState } from "react";
import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { MobileMenu } from "@/components/mobile-menu";

export function AppTopbar({ user, unread = 0 }: { user: { name: string; email: string }; unread?: number }) {
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/90 px-3 py-3 backdrop-blur sm:px-4">
      <MobileMenu unread={unread} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-7 w-auto lg:hidden" />

      <div className="relative hidden flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
        <input
          placeholder="Procurar torneios, clubes…"
          className="w-full max-w-md rounded-xl border border-line bg-surface-soft py-2 pl-10 pr-3 text-sm focus:border-brand-purple focus:outline-none"
        />
      </div>

      <div className="relative ml-auto">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-surface-soft">
          <span className="grid size-8 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">{initials}</span>
          <span className="hidden text-sm font-medium text-zinc-800 sm:block">{user.name}</span>
          <ChevronDown className="size-4 text-soft" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="pz-shadow-card absolute right-0 z-40 mt-2 w-48 rounded-xl border border-line bg-surface p-1">
              <a href="/perfil" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft">
                <User className="size-4" /> Perfil
              </a>
              <form action={logout}>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger-bg">
                  <LogOut className="size-4" /> Terminar sessão
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
