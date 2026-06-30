import { prisma } from "@/lib/prisma";
import { applClass, applLevel, applPoints, placementForRound } from "@/lib/appl-points";

// Atribui pontos de ranking aos jogadores de uma categoria, pela COLOCAÇÃO no quadro,
// segundo a tabela oficial APPL (classe da prova × nível × ronda atingida). Só pontua se a
// competição CONTA para o ranking APPL. Ambos os jogadores de uma dupla recebem os pontos.
export async function awardCategoryPoints(categoryId: number) {
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { name: true, competition: { select: { applRanked: true, applType: true } } },
  });
  if (!cat?.competition.applRanked) return; // provas sociais/não-oficiais não pontuam
  const cls = applClass(cat.competition.applType);
  if (!cls) return;
  const level = applLevel(cat.name);

  const entries = await prisma.entry.findMany({ where: { categoryId, status: "CONFIRMED" }, include: { team: true } });
  const teamToEntry = new Map<number, number>();
  const playerToEntry = new Map<number, number>();
  const entryPlayers = new Map<number, number[]>();
  for (const e of entries) {
    if (e.teamId) teamToEntry.set(e.teamId, e.id);
    if (e.playerId) playerToEntry.set(e.playerId, e.id);
    const pls: number[] = [];
    if (e.team) {
      pls.push(e.team.player1Id);
      if (e.team.player2Id) pls.push(e.team.player2Id);
    } else if (e.playerId) {
      pls.push(e.playerId);
    }
    entryPlayers.set(e.id, pls);
  }

  // A colocação vem do quadro de eliminatórias.
  const ko = await prisma.stage.findFirst({
    where: { categoryId, type: "KNOCKOUT" },
    orderBy: { order: "desc" },
    include: { matches: { include: { sides: { include: { players: true } }, result: true } } },
  });
  if (!ko || ko.matches.length === 0) return;

  const entryOf = (side?: { teamId: number | null; players: { playerId: number }[] }) => {
    if (!side) return undefined;
    if (side.teamId) return teamToEntry.get(side.teamId);
    if (side.players[0]) return playerToEntry.get(side.players[0].playerId);
    return undefined;
  };

  const maxRound = Math.max(...ko.matches.map((m) => m.round));
  const ptsByEntry = new Map<number, number>();
  let champion: number | undefined;

  for (const m of ko.matches) {
    if (m.status !== "DONE" || !m.result) continue;
    const fromEnd = maxRound - m.round; // 0 = final
    const loser = entryOf(m.sides.find((s) => s.side !== m.result!.winnerSide));
    if (loser != null) ptsByEntry.set(loser, applPoints(cls, level, placementForRound(fromEnd, false)));
    if (fromEnd === 0) champion = entryOf(m.sides.find((s) => s.side === m.result!.winnerSide));
  }
  if (champion != null) ptsByEntry.set(champion, applPoints(cls, level, "VENCEDOR"));

  for (const [eid, pts] of ptsByEntry) {
    for (const pid of entryPlayers.get(eid) ?? []) {
      await prisma.player.update({ where: { id: pid }, data: { rankingPoints: { increment: pts } } });
    }
  }
}

export async function playerRank(playerId: number) {
  const me = await prisma.player.findUnique({ where: { id: playerId }, select: { rankingPoints: true } });
  if (!me) return null;
  const better = await prisma.player.count({ where: { rankingPoints: { gt: me.rankingPoints } } });
  return better + 1;
}

export async function getRanking(gender?: "MALE" | "FEMALE") {
  const players = await prisma.player.findMany({
    where: gender ? { gender } : {},
    orderBy: [{ rankingPoints: "desc" }, { name: "asc" }],
    take: 100,
    select: { id: true, name: true, rankingPoints: true, gender: true, city: true },
  });
  return players.map((p, i) => ({ ...p, rank: i + 1 }));
}
