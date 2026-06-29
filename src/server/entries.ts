import { prisma } from "@/lib/prisma";
import { sortCategories } from "@/lib/category-order";

export async function getOpenCompetitions() {
  const comps = await prisma.competition.findMany({
    where: { status: "OPEN" },
    include: {
      club: true,
      categories: { include: { _count: { select: { entries: true } } }, orderBy: { id: "asc" } },
    },
    orderBy: { startDate: "asc" },
  });
  for (const c of comps) c.categories = sortCategories(c.categories);
  return comps;
}

export function getCompetitionEntries(competitionId: number) {
  return prisma.entry.findMany({
    where: { category: { competitionId } },
    include: {
      category: true,
      player: true,
      team: { include: { player1: true, player2: true } },
      payments: true,
    },
    orderBy: [{ categoryId: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
  });
}

export async function getMyEntries(userId: number) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (!player) return [];
  const teams = await prisma.team.findMany({
    where: { OR: [{ player1Id: player.id }, { player2Id: player.id }] },
    select: { id: true },
  });
  const teamIds = teams.map((t) => t.id);
  return prisma.entry.findMany({
    where: { OR: [{ playerId: player.id }, { teamId: { in: teamIds } }] },
    include: {
      category: { include: { competition: { include: { club: true } } } },
      team: { include: { player1: true, player2: true } },
      payments: { select: { status: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Lista de jogadores para escolher o parceiro (id + nome).
export function getPlayersForPicker() {
  return prisma.player.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}
