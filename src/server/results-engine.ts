import { prisma } from "@/lib/prisma";
import { computeStandings, type MatchOutcome } from "@/lib/tournament/standings";
import { tallyGames, type SetScore } from "@/lib/tournament/score";

export type { SetScore };

export async function submitMatchResult(matchId: number, sets: SetScore[]) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { sides: { include: { players: true } } } });
  if (!match) throw new Error("Jogo não encontrado.");
  if (sets.length === 0) throw new Error("Indica pelo menos um set.");

  const { setsA, setsB, gamesA, gamesB } = tallyGames(sets);
  if (setsA === setsB) throw new Error("O resultado tem de ter um vencedor.");
  const winnerSide = setsA > setsB ? "A" : "B";
  const score = { sets, setsA, setsB, gamesA, gamesB };

  await prisma.matchResult.upsert({
    where: { matchId },
    update: { winnerSide: winnerSide as never, score },
    create: { matchId, winnerSide: winnerSide as never, score },
  });
  await prisma.match.update({ where: { id: matchId }, data: { status: "DONE" } });

  // Eliminatórias: o vencedor avança para o jogo seguinte
  if (match.nextMatchId) {
    const winSide = match.sides.find((s) => s.side === winnerSide);
    const targetSlot = match.slotInRound % 2 === 0 ? "A" : "B";
    const nextSide = await prisma.matchSide.findFirst({ where: { matchId: match.nextMatchId, side: targetSlot } });
    if (winSide && nextSide) {
      await prisma.matchSidePlayer.deleteMany({ where: { matchSideId: nextSide.id } });
      await prisma.matchSide.update({
        where: { id: nextSide.id },
        data: { teamId: winSide.teamId ?? null, label: null },
      });
      for (const wp of winSide.players) {
        await prisma.matchSidePlayer.create({ data: { matchSideId: nextSide.id, playerId: wp.playerId } });
      }
    }
  }

  // Grupos: recalcular a classificação
  if (match.groupId) {
    await recomputeGroupStandings(match.stageId, match.groupId);
  }
}

async function recomputeGroupStandings(stageId: number, groupId: number) {
  const members = await prisma.groupEntry.findMany({ where: { groupId }, select: { entryId: true } });
  const entryIds = members.map((m) => m.entryId);
  const entries = await prisma.entry.findMany({
    where: { id: { in: entryIds } },
    select: { id: true, teamId: true, playerId: true },
  });
  const teamToEntry = new Map<number, number>();
  const playerToEntry = new Map<number, number>();
  for (const e of entries) {
    if (e.teamId) teamToEntry.set(e.teamId, e.id);
    if (e.playerId) playerToEntry.set(e.playerId, e.id);
  }

  const matches = await prisma.match.findMany({
    where: { groupId, status: "DONE" },
    include: { result: true, sides: { include: { players: true } } },
  });

  const entryOf = (side?: { teamId: number | null; players: { playerId: number }[] }) => {
    if (!side) return undefined;
    if (side.teamId) return teamToEntry.get(side.teamId);
    if (side.players[0]) return playerToEntry.get(side.players[0].playerId);
    return undefined;
  };

  const outcomes: MatchOutcome[] = [];
  for (const m of matches) {
    if (!m.result) continue;
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    const ha = entryOf(a);
    const hb = entryOf(b);
    if (ha == null || hb == null) continue;
    const sc = m.result.score as { sets?: SetScore[]; setsA: number; setsB: number; gamesA: number; gamesB: number };
    // Re-conta a partir dos sets (corrige super tie-breaks antigos guardados como 10-8).
    const t = Array.isArray(sc.sets)
      ? tallyGames(sc.sets)
      : { setsA: sc.setsA ?? 0, setsB: sc.setsB ?? 0, gamesA: sc.gamesA ?? 0, gamesB: sc.gamesB ?? 0 };
    outcomes.push({
      homeId: ha,
      awayId: hb,
      homeSets: t.setsA,
      awaySets: t.setsB,
      homeGames: t.gamesA,
      awayGames: t.gamesB,
    });
  }

  const table = computeStandings(entryIds, outcomes);
  for (const row of table) {
    await prisma.standing.updateMany({
      where: { stageId, groupId, entryId: row.id },
      data: {
        played: row.played,
        won: row.won,
        lost: row.lost,
        setsFor: row.setsFor,
        setsAgainst: row.setsAgainst,
        gamesFor: row.gamesFor,
        gamesAgainst: row.gamesAgainst,
        points: row.points,
        rank: row.rank,
      },
    });
  }
}
