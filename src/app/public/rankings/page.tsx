import Link from "next/link";
import { Trophy, MapPin } from "lucide-react";
import { getRanking } from "@/server/ranking-engine";
import { levelFromPoints } from "@/server/player-dashboard";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking · PadelZone" };

const FILTERS = [
  { key: "", label: "Todos", href: "/public/rankings" },
  { key: "MALE", label: "Masculino", href: "/public/rankings?g=MALE" },
  { key: "FEMALE", label: "Feminino", href: "/public/rankings?g=FEMALE" },
];

// Medalhas para os três primeiros lugares.
const BADGE: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-zinc-200 text-zinc-600",
  3: "bg-orange-100 text-orange-700",
};

export default async function PublicRankingsPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const g = sp.g === "MALE" || sp.g === "FEMALE" ? sp.g : "";

  const players = g ? await getRanking(g) : await getRanking();

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-zinc-900 sm:text-3xl">{t("Ranking nacional")}</h1>
          <p className="mt-1 text-muted">{t("Os jogadores com mais pontos em Angola.")}</p>
        </div>

        {/* Filtro por género */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = g === f.key;
            return (
              <Link
                key={f.key}
                href={f.href}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active ? "pz-gradient text-white" : "border border-line bg-surface text-muted hover:bg-surface-soft"
                }`}
              >
                {t(f.label)}
              </Link>
            );
          })}
        </div>

        {/* Leaderboard */}
        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-14 text-center">
            <Trophy className="mx-auto size-8 text-soft" />
            <p className="mt-2 text-muted">{t("Ainda não há jogadores no ranking.")}</p>
          </div>
        ) : (
          <div className="pz-shadow-card divide-y divide-line rounded-2xl border border-line bg-surface">
            {players.map((p) => {
              const lvl = levelFromPoints(p.rankingPoints);
              const badge = BADGE[p.rank];
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                  {/* Posição */}
                  <div className="w-9 shrink-0 text-center">
                    {badge ? (
                      <span className={`inline-grid size-8 place-items-center rounded-full text-sm font-bold ${badge}`}>{p.rank}</span>
                    ) : (
                      <span className="text-sm font-semibold text-soft">{p.rank}</span>
                    )}
                  </div>

                  {/* Jogador */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900">{p.name}</p>
                    {p.city && (
                      <p className="mt-0.5 hidden items-center gap-1 text-xs text-muted sm:flex">
                        <MapPin className="size-3.5 shrink-0 text-soft" />
                        {p.city}
                      </p>
                    )}
                  </div>

                  {/* Nível */}
                  <span className="hidden shrink-0 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-brand-purple sm:inline-block">
                    {t(lvl.name)}
                  </span>

                  {/* Pontos */}
                  <div className="shrink-0 text-right">
                    <span className="font-bold tabular-nums text-zinc-900">{p.rankingPoints}</span>{" "}
                    <span className="text-xs text-soft">{t("pts")}</span>
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
