import Link from "next/link";
import { Search, MapPin, User } from "lucide-react";
import { getRanking } from "@/server/ranking-engine";
import { levelFromPoints } from "@/server/player-dashboard";
import { GENDER_LABEL } from "@/lib/categories";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jogadores · PadelZone" };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default async function PublicJogadoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const q = sp.q ?? "";

  const all = await getRanking();
  const shown = q ? all.filter((p) => norm(p.name).includes(norm(q))) : all;

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-zinc-900 sm:text-3xl">{t("Jogadores")}</h1>
          <p className="mt-1 text-muted">{t("Procura jogadores e vê o seu nível e pontos no ranking.")}</p>
        </div>

        {/* Pesquisa */}
        <form method="get" className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-soft" />
            <input
              name="q"
              defaultValue={q}
              placeholder={t("Procura um jogador…")}
              className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-3 text-sm focus:border-brand-purple focus:outline-none"
            />
          </div>
          <button type="submit" className="pz-gradient shrink-0 rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-95">{t("Pesquisar")}</button>
        </form>

        {/* Diretório */}
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-14 text-center">
            <User className="mx-auto size-8 text-soft" />
            <p className="mt-2 text-muted">{t("Nenhum jogador encontrado.")}</p>
            <Link href="/public/jogadores" className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline">{t("Limpar")}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => {
              const lvl = levelFromPoints(p.rankingPoints);
              return (
                <div key={p.id} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-bold text-brand-purple">
                      {initials(p.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900">{p.name}</p>
                      {p.city && (
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <MapPin className="size-3 shrink-0 text-soft" /> {p.city}
                        </p>
                      )}
                    </div>
                  </div>
                  {p.gender && p.gender !== "MIXED" && (
                    <p className="mt-2 text-xs text-muted">{t(GENDER_LABEL[p.gender] ?? p.gender)}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-brand-purple">{t(lvl.name)}</span>
                    <span className="text-sm font-bold tabular-nums text-zinc-900">{p.rankingPoints} {t("pts")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
