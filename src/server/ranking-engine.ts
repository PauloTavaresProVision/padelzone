import { prisma } from "@/lib/prisma";

// Atribui pontos de ranking aos jogadores de uma categoria, pelo desempenho.
// Esquema simples (afinável): 10 base + 20 por jogo ganho + 30 campeão (eliminatórias)
// + 20 por 1.º lugar de grupo. Ambos os jogadores de uma dupla recebem os pontos.
export async function awardCategoryPoints(categoryId: number) {
  const entries = await prisma.entry.findMany({
    where: { categoryId, status: "CONFIRMED" },
    include: { team: true },
  });

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

  const stage = await prisma.stage.findFirst({
    where: { categoryId },
    include: { matches: { include: { sides: { include: { players: true } }, result: true } }, standings: true },
  });
  if (!stage) return;

  const entryOf = (side?: { teamId: number | null; players: { playerId: number }[] }) => {
    if (!side) return undefined;
    if (side.teamId) return teamToEntry.get(side.teamId);
    if (side.players[0]) return playerToEntry.get(side.players[0].playerId);
    return undefined;
  };

  const won = new Map<number, number>();
  let championEntry: number | undefined;
  const maxRound = stage.matches.length ? Math.max(...stage.matches.map((m) => m.round)) : 0;

  for (const m of stage.matches) {
    if (m.status !== "DONE" || !m.result) continue;
    const we = entryOf(m.sides.find((s) => s.side === m.result!.winnerSide));
    if (we == null) continue;
    won.set(we, (won.get(we) ?? 0) + 1);
    if (stage.type === "KNOCKOUT" && m.nextMatchId === null && m.round === maxRound) championEntry = we;
  }

  const rank1 = new Set<number>();
  if (stage.type === "GROUPS") for (const s of stage.standings) if (s.rank === 1) rank1.add(s.entryId);

  for (const e of entries) {
    let pts = 10 + 20 * (won.get(e.id) ?? 0);
    if (championEntry === e.id) pts += 30;
    if (rank1.has(e.id)) pts += 20;
    for (const pid of entryPlayers.get(e.id) ?? []) {
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
