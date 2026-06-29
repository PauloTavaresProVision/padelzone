import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { getCategoryStages, sideName } from "@/server/draw";
import { ResultsBoard, type Game } from "@/components/results-board";
import { TournamentHeader } from "@/components/tournament-header";

export const dynamic = "force-dynamic";

type Stage = Awaited<ReturnType<typeof getCategoryStages>>[number];
type Match = Stage["matches"][number];
type Score = { sets: { a: number; b: number }[] };

function roundLabel(round: number, total: number) {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Meias-finais";
  if (fromEnd === 2) return "Quartos de final";
  if (fromEnd === 3) return "Oitavos de final";
  return `${round + 1}ª ronda`;
}
const fmtWhen = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);

export default async function ResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const courts = await prisma.court.findMany({ where: { clubId: comp.clubId }, select: { id: true, name: true } });
  const courtMap = new Map(courts.map((c) => [c.id, c.name]));

  const buildGame = (m: Match, cat: string, section: string): Game => {
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    const score = m.result ? (m.result.score as unknown as Score) : null;
    return {
      id: m.id,
      cat,
      section,
      nameA: a ? sideName(a) : "—",
      nameB: b ? sideName(b) : "—",
      realA: !!(a?.team || a?.players?.length),
      realB: !!(b?.team || b?.players?.length),
      done: m.status === "DONE",
      winner: (m.result?.winnerSide as "A" | "B" | null) ?? null,
      sets: score?.sets ?? [],
      courtName: m.courtId ? courtMap.get(m.courtId) ?? null : null,
      whenLabel: m.scheduledAt ? fmtWhen(m.scheduledAt) : null,
    };
  };

  const categories = comp.categories.map((c) => c.name);
  const games: Game[] = [];
  for (const cat of comp.categories) {
    const stages = await getCategoryStages(cat.id);
    for (const stage of stages) {
      if (stage.type === "GROUPS") {
        for (const m of stage.matches) games.push(buildGame(m, cat.name, m.group?.name ?? "Grupos"));
      } else {
        const total = stage.matches.length ? Math.max(...stage.matches.map((m) => m.round)) + 1 : 0;
        for (const m of stage.matches) games.push(buildGame(m, cat.name, roundLabel(m.round, total)));
      }
    }
  }

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Resultados"
        subtitle="Regista os resultados dos jogos."
        help={[
          { label: "Registar resultado", desc: "Escreve os games de cada set para as duas duplas e carrega em Guardar. O vencedor é determinado automaticamente pelos sets ganhos." },
          { label: "Avanço automático", desc: "Nas eliminatórias o vencedor avança no quadro; nos grupos atualiza a classificação." },
          { label: "Procurar e filtrar", desc: "Filtra por categoria e estado (Por jogar / Terminados) ou procura por nome." },
        ]}
      />
      <ResultsBoard games={games} categories={categories} />
    </div>
  );
}
