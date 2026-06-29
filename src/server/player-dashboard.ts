import { prisma } from "@/lib/prisma";
import { playerRank } from "@/server/ranking-engine";

const PER_LEVEL = 500;
const LEVEL_NAMES = ["Iniciante", "Intermédio", "Avançado", "Pro", "Elite"];

export function levelFromPoints(pts: number) {
  const level = Math.floor(pts / PER_LEVEL) + 1;
  const name = LEVEL_NAMES[Math.min(Math.floor((level - 1) / 2), LEVEL_NAMES.length - 1)];
  const base = (level - 1) * PER_LEVEL;
  const next = level * PER_LEVEL;
  const pct = Math.max(0, Math.min(100, Math.round(((pts - base) / (next - base)) * 100)));
  return { level, name, current: pts, next, pct };
}

// Tudo o que isto devolve vem da base de dados. Para um jogador novo, vem vazio/zero
// (a interface mostra estados vazios honestos — nunca números inventados).
export async function getPlayerDashboard(userId: number) {
  const player = await prisma.player.findUnique({ where: { userId } });

  if (!player) {
    return {
      player: null,
      rank: null as number | null,
      rankingPoints: 0,
      level: levelFromPoints(0),
      stats: { torneios: 0, inscricoes: 0, jogos: 0, vitorias: 0, taxa: null as number | null, parceiros: 0 },
      entries: [] as Awaited<ReturnType<typeof loadEntries>>,
      upcoming: [] as Awaited<ReturnType<typeof loadMatches>>,
      results: [] as Awaited<ReturnType<typeof loadMatches>>,
    };
  }

  const teams = await prisma.team.findMany({
    where: { OR: [{ player1Id: player.id }, { player2Id: player.id }] },
    select: { id: true, player1Id: true, player2Id: true },
  });
  const teamIds = teams.map((t) => t.id);

  const entries = await loadEntries(player.id, teamIds);
  const matches = await loadMatches(player.id, teamIds);

  const done = matches.filter((m) => m.status === "DONE" && m.result);
  const upcoming = matches.filter((m) => m.status !== "DONE");

  let vitorias = 0;
  for (const m of done) {
    const mySide = m.sides.find(
      (s) => (s.teamId != null && teamIds.includes(s.teamId)) || s.players.some((p) => p.playerId === player.id)
    );
    if (mySide && m.result?.winnerSide === mySide.side) vitorias++;
  }

  const torneios = new Set(entries.map((e) => e.category.competitionId)).size;
  const parceiros = new Set(
    teams.flatMap((t) => [t.player1Id, t.player2Id]).filter((id): id is number => !!id && id !== player.id)
  ).size;

  return {
    player,
    rank: await playerRank(player.id),
    rankingPoints: player.rankingPoints,
    level: levelFromPoints(player.rankingPoints),
    stats: {
      torneios,
      inscricoes: entries.length,
      jogos: done.length,
      vitorias,
      taxa: done.length ? Math.round((vitorias / done.length) * 100) : null,
      parceiros,
    },
    entries,
    upcoming,
    results: done,
  };
}

function loadEntries(playerId: number, teamIds: number[]) {
  return prisma.entry.findMany({
    where: { OR: [{ playerId }, { teamId: { in: teamIds } }] },
    include: { category: { include: { competition: { include: { club: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

function loadMatches(playerId: number, teamIds: number[]) {
  return prisma.match.findMany({
    where: {
      sides: {
        some: { OR: [{ teamId: { in: teamIds } }, { players: { some: { playerId } } }] },
      },
    },
    include: {
      result: true,
      sides: { include: { players: true } },
      stage: { include: { category: { include: { competition: { include: { club: true } } } } } },
    },
    orderBy: [{ scheduledAt: "asc" }],
  });
}
