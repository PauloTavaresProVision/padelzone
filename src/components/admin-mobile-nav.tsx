"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Users, MessageSquare, Settings } from "lucide-react";

const items = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/torneios", label: "Torneios", icon: Trophy },
  { href: "/admin/jogadores", label: "Jogadores", icon: Users },
  { href: "/admin/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/admin/definicoes", label: "Definições", icon: Settings },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  if (/^\/admin\/torneios\/\d+/.test(pathname)) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition ${
              active ? "text-brand-purple" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
