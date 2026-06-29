import Link from "next/link";
import { getRanking } from "@/server/ranking-engine";
import { levelFromPoints } from "@/server/player-dashboard";
import { RankingList, type RankRow } from "@/components/ranking-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking · PadelZone" };

const FILTERS: { g?: "MALE" | "FEMALE"; label: string }[] = [
  { g: undefined, label: "Todos" },
  { g: "MALE", label: "Masculino" },
  { g: "FEMALE", label: "Feminino" },
];

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const gender = g === "MALE" || g === "FEMALE" ? g : undefined;
  const raw = await getRanking(gender);
  const rows: RankRow[] = raw.map((r) => {
    const lvl = levelFromPoints(r.rankingPoints);
    return { id: r.id, rank: r.rank, name: r.name, points: r.rankingPoints, city: r.city, levelName: `Nível ${lvl.level} · ${lvl.name}` };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Ranking</h1>
        <p className="mt-1 text-sm text-muted">Classificação dos jogadores por pontos.</p>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-surface-soft p-1">
        {FILTERS.map((f) => {
          const active = gender === f.g;
          return (
            <Link
              key={f.label}
              href={f.g ? `/ranking?g=${f.g}` : "/ranking"}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${active ? "bg-surface text-brand-purple shadow-sm" : "text-muted hover:text-zinc-900"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <RankingList rows={rows} />
    </div>
  );
}
