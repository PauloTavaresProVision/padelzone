"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Swords, BarChart3, MessageSquare, User } from "lucide-react";

const items = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/torneios", label: "Torneios", icon: Trophy },
  { href: "/jogos", label: "Jogos", icon: Swords },
  { href: "/ranking", label: "Ranking", icon: BarChart3 },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function MobileNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const badge = href === "/mensagens" && unread > 0;
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-brand-purple" : "text-soft"}`}
          >
            <span className="relative">
              <Icon className="size-5" />
              {badge && <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-brand-purple ring-2 ring-surface" />}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
