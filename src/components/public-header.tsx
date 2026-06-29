"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import { useT } from "./i18n-provider";
import { LangSwitcher } from "./lang-switcher";

const NAV = [
  { href: "/public", label: "Início" },
  { href: "/public/tournaments", label: "Torneios" },
  { href: "/public/rankings", label: "Rankings" },
  { href: "/public/jogadores", label: "Jogadores" },
  { href: "/public/clubes", label: "Clubes" },
  { href: "/public/contacto", label: "Contacto" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useT();
  const isActive = (href: string) => (href === "/public" ? pathname === "/public" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-9">
          <Link href="/public" className="flex items-center" aria-label="PadelZone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-10 w-auto sm:h-11" />
          </Link>
          <nav className="hidden items-stretch gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex h-[72px] items-center border-b-2 px-3 text-sm font-semibold transition ${
                  isActive(n.href) ? "border-brand-purple text-brand-purple" : "border-transparent text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t(n.label)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <LangSwitcher className="hidden sm:flex" />
          <Link href="/login" className="hidden items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft sm:inline-flex">
            <LogIn className="size-4" /> {t("Entrar")}
          </Link>
          <Link href="/registar" className="pz-gradient hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:inline-block">
            {t("Criar conta")}
          </Link>
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-zinc-700 transition hover:bg-surface-soft lg:hidden" aria-label={t("Menu")}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive(n.href) ? "bg-primary-light text-brand-purple" : "text-zinc-700 hover:bg-surface-soft"}`}>
                {t(n.label)}
              </Link>
            ))}
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <Link href="/login" className="flex-1 rounded-xl border border-line py-2 text-center text-sm font-semibold text-zinc-700">{t("Entrar")}</Link>
              <Link href="/registar" className="pz-gradient flex-1 rounded-xl py-2 text-center text-sm font-semibold text-white">{t("Criar conta")}</Link>
              <LangSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
