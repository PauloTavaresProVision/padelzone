import { prisma } from "@/lib/prisma";

const teamInc = { include: { player1: true, player2: true } };

export function getCategoryStage(categoryId: number) {
  return prisma.stage.findFirst({
    where: { categoryId },
    orderBy: { order: "asc" },
    include: {
      groups: {
        orderBy: { id: "asc" },
        include: { members: { include: { entry: { include: { team: teamInc, player: true } } } } },
      },
      matches: {
        orderBy: [{ round: "asc" }, { slotInRound: "asc" }],
        include: { group: true, result: true, sides: { include: { team: teamInc, players: { include: { player: true } } } } },
      },
      standings: {
        // Ordena pelo rank (que já codifica o desempate completo: confronto direto, sets, jogos).
        // Ordenar por pontos podia contradizer o rank quando as equipas jogaram nº de jogos diferente.
        orderBy: [{ groupId: "asc" }, { rank: "asc" }],
        include: { entry: { include: { team: teamInc, player: true } } },
      },
    },
  });
}

// Todas as fases de uma categoria (ex.: Grupos + Quadro final), por ordem.
export function getCategoryStages(categoryId: number) {
  return prisma.stage.findMany({
    where: { categoryId },
    orderBy: { order: "asc" },
    include: {
      groups: {
        orderBy: { id: "asc" },
        include: { members: { include: { entry: { include: { team: teamInc, player: true } } } } },
      },
      matches: {
        orderBy: [{ round: "asc" }, { slotInRound: "asc" }],
        include: { group: true, result: true, sides: { include: { team: teamInc, players: { include: { player: true } } } } },
      },
      standings: {
        // Ordena pelo rank (que já codifica o desempate completo: confronto direto, sets, jogos).
        // Ordenar por pontos podia contradizer o rank quando as equipas jogaram nº de jogos diferente.
        orderBy: [{ groupId: "asc" }, { rank: "asc" }],
        include: { entry: { include: { team: teamInc, player: true } } },
      },
    },
  });
}

type TeamLike = { player1: { name: string }; player2: { name: string } | null } | null;

export function entryName(entry: { team: TeamLike; player: { name: string } | null } | null) {
  if (!entry) return "—";
  if (entry.team) return `${entry.team.player1.name}${entry.team.player2 ? " / " + entry.team.player2.name : ""}`;
  return entry.player?.name ?? "—";
}

export function sideName(side: {
  team: TeamLike;
  players: { player: { name: string } }[];
  label: string | null;
}) {
  if (side.team) return `${side.team.player1.name}${side.team.player2 ? " / " + side.team.player2.name : ""}`;
  if (side.players.length) return side.players.map((p) => p.player.name).join(" / ");
  return side.label ?? "—";
}
