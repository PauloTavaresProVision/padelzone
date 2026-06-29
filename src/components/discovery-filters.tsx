"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useT } from "@/components/i18n-provider";

const GENDERS = [
  { value: "", label: "Todas as categorias" },
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "MIXED", label: "Misto" },
];

export function DiscoveryFilters({
  q, city, gender, status, cities,
}: {
  q: string; city: string; gender: string; status: string; cities: string[];
}) {
  const router = useRouter();
  const t = useT();
  const go = (next: Record<string, string>) => {
    const params = { q, city, gender, status, ...next };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    const s = sp.toString();
    router.push(`/public/tournaments${s ? `?${s}` : ""}`);
  };
  const anyFilter = !!(q || city || gender || status);
  const select = "rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-zinc-800 focus:border-brand-purple focus:outline-none";

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-soft" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("Procura por nome do torneio ou clube…")}
            className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-3 text-sm focus:border-brand-purple focus:outline-none"
          />
        </div>
        <button type="submit" className="pz-gradient shrink-0 rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-95">{t("Pesquisar")}</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select value={city} onChange={(e) => go({ city: e.target.value })} className={select}>
          <option value="">{t("Todas as cidades")}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={gender} onChange={(e) => go({ gender: e.target.value })} className={select}>
          {GENDERS.map((g) => <option key={g.value} value={g.value}>{t(g.label)}</option>)}
        </select>
        {anyFilter && (
          <button onClick={() => router.push("/public/tournaments")} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:text-zinc-900">
            <X className="size-3.5" /> {t("Limpar filtros")}
          </button>
        )}
      </div>
    </div>
  );
}
