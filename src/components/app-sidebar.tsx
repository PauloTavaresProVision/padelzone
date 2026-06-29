"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLAYER_NAV } from "./player-nav";

export function AppSidebar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface p-5 lg:flex">
      <Link href="/inicio" className="mb-5 flex justify-center pt-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-12 w-auto" />
      </Link>

      <nav className="flex-1 space-y-1">
        {PLAYER_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const badge = href === "/mensagens" && unread > 0 ? unread : null;
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                active ? "pz-gradient pz-shadow-soft text-white" : "text-muted hover:bg-surface-soft"
              }`}
            >
              <Icon className="size-[18px]" />
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
    </aside>
  );
}
