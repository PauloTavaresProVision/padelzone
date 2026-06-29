"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { PLAYER_NAV } from "./player-nav";

export function MobileMenu({ unread = 0 }: { unread?: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative rounded-lg p-2 text-zinc-700 transition hover:bg-surface-soft lg:hidden" aria-label="Abrir menu">
        <Menu className="size-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand-purple" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-surface p-4">
            <div className="mb-5 flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-10 w-auto" />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="rounded-lg p-1.5 transition hover:bg-surface-soft">
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {PLAYER_NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                const badge = href === "/mensagens" && unread > 0 ? unread : null;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? "pz-gradient text-white" : "text-muted hover:bg-surface-soft"
                    }`}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{label}</span>
                    {badge != null && (
                      <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white/25 text-white" : "bg-brand-purple text-white"}`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <form action={logout} className="border-t border-line pt-2">
              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-bg">
                <LogOut className="size-5" /> Terminar sessão
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
