"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/master", label: "Clubes" },
  { href: "/master/patrocinadores", label: "Patrocinadores" },
  { href: "/master/mensagens", label: "Mensagens" },
  { href: "/master/definicoes", label: "Definições" },
];

export function MasterNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/master" ? pathname === "/master" : pathname.startsWith(href));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="-mb-px flex gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              isActive(n.href) ? "border-brand-purple text-brand-purple" : "border-transparent text-muted hover:text-zinc-900"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
