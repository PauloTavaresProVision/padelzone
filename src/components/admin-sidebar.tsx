"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Tags, Users, LayoutGrid, CreditCard, MessageSquare, Settings, LogOut, MapPin } from "lucide-react";
import { logout } from "@/server/actions/auth";

const items = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/torneios", label: "Torneios", icon: Trophy },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
  { href: "/admin/jogadores", label: "Jogadores", icon: Users },
  { href: "/admin/campos", label: "Campos", icon: LayoutGrid },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/admin/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/admin/definicoes", label: "Definições", icon: Settings },
];

export function AdminSidebar({ clubName, clubCity, userName }: { clubName: string; clubCity: string; userName: string }) {
  const pathname = usePathname();
  // Dentro de um torneio, a navegação é a barra lateral do próprio torneio.
  if (/^\/admin\/torneios\/\d+/.test(pathname)) return null;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-line bg-surface p-5 lg:flex">
      <Link href="/admin" className="flex justify-center pt-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-12 w-auto" />
      </Link>

      <div className="pz-shadow-soft rounded-[18px] border border-line bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">Clube</p>
        <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">{clubName}</p>
        {clubCity && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="size-3.5 text-soft" /> {clubCity}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                active ? "pz-gradient pz-shadow-soft text-white" : "text-muted hover:bg-surface-soft"
              }`}
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">
            {userName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
            <p className="text-xs text-muted">Organizador</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft"
          >
            <LogOut className="size-[18px]" />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
