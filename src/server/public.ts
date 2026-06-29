import { prisma } from "@/lib/prisma";
import { sideName } from "@/server/draw";

// Estados visíveis ao público (DRAFT e CANCELLED ficam ocultos).
const PUBLIC_STATUSES = ["OPEN", "ONGOING", "FINISHED"] as const;
const ORDER: Record<string, number> = { OPEN: 0, ONGOING: 1, FINISHED: 2 };

// Só clubes aprovados (ACTIVE) e dentro da janela de acesso aparecem ao público.
function liveClubFilter() {
  const now = new Date();
  return {
    status: "ACTIVE" as const,
    AND: [
      { OR: [{ accessStart: null }, { accessStart: { lte: now } }] },
      { OR: [{ accessEnd: null }, { accessEnd: { gte: now } }] },
    ],
  };
}

export type PublicCompetition = {
  id: number;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  imageUrl: string | null;
  club: { name: string; city: string | null; logoUrl: string | null };
  categoryCount: number;
  entryCount: number;
  genders: string[];
};

// Todos os torneios públicos (descoberta). A página filtra/pesquisa em memória (poucos torneios).
export async function getPublicCompetitions(): Promise<PublicCompetition[]> {
  const comps = await prisma.competition.findMany({
    where: { status: { in: [...PUBLIC_STATUSES] }, club: liveClubFilter() },
    include: {
      club: { select: { name: true, city: true, logoUrl: true } },
      categories: { select: { gender: true, _count: { select: { entries: true } } } },
    },
  });
  return comps
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      imageUrl: c.imageUrl,
      club: c.club,
      categoryCount: c.categories.length,
      entryCount: c.categories.reduce((a, cat) => a + cat._count.entries, 0),
      genders: [...new Set(c.categories.map((cat) => cat.gender as string))],
    }))
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
}

// Próximos jogos agendados de um torneio (para a pré-visualização do calendário).
export async function getUpcomingPublicMatches(competitionId: number, take = 6) {
  return prisma.match.findMany({
    where: { stage: { category: { competitionId } }, scheduledAt: { not: null }, status: { not: "DONE" } },
    orderBy: { scheduledAt: "asc" },
    take,
    include: {
      court: { select: { name: true } },
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { name: true } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
    },
  });
}

// Todos os jogos de um torneio (separadores Jogos / Calendário / Resultados).
export async function getTournamentMatches(competitionId: number) {
  return prisma.match.findMany({
    where: { stage: { category: { competitionId } } },
    orderBy: [{ scheduledAt: "asc" }, { round: "asc" }, { slotInRound: "asc" }],
    include: {
      court: { select: { name: true } },
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { id: true, name: true } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
      result: true,
    },
  });
}

// Inscritos (duplas/jogadores) por categoria, para o separador Categorias.
export async function getTournamentEntries(competitionId: number) {
  return prisma.entry.findMany({
    where: { category: { competitionId }, status: { in: ["CONFIRMED", "PENDING"] } },
    orderBy: [{ categoryId: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
    include: {
      team: { include: { player1: true, player2: true } },
      player: true,
      category: { select: { id: true, name: true } },
    },
  });
}

export type PublicClub = { id: number; name: string; city: string | null; logoUrl: string | null; competitions: number; players: number };

// Perfil público de um clube (página pública do clube).
export async function getPublicClub(id: number) {
  return prisma.club.findFirst({
    where: { id, ...liveClubFilter() },
    include: {
      courts: { select: { id: true, name: true }, orderBy: { id: "asc" } },
      competitions: {
        where: { status: { in: [...PUBLIC_STATUSES] } },
        orderBy: [{ startDate: "desc" }],
        select: { id: true, name: true, status: true, startDate: true, endDate: true, imageUrl: true, _count: { select: { categories: true } } },
      },
    },
  });
}

// Diretório de clubes (página pública Clubes).
export async function getPublicClubs(): Promise<PublicClub[]> {
  const clubs = await prisma.club.findMany({
    where: liveClubFilter(),
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, logoUrl: true, _count: { select: { competitions: true, players: true } } },
  });
  return clubs.map((c) => ({ id: c.id, name: c.name, city: c.city, logoUrl: c.logoUrl, competitions: c._count.competitions, players: c._count.players }));
}

export type PublicResult = {
  id: number; competitionId: number; competition: string; club: string; category: string; section: string;
  nameA: string; nameB: string; winner: string | null; sets: { a: number; b: number }[] | null; when: Date | null;
};

// Resultados recentes em todos os torneios públicos (página pública Resultados).
export async function getPublicResults(take = 30): Promise<PublicResult[]> {
  const matches = await prisma.match.findMany({
    where: { status: "DONE", result: { isNot: null }, stage: { category: { competition: { status: { in: [...PUBLIC_STATUSES] } } } } },
    orderBy: [{ scheduledAt: "desc" }, { id: "desc" }],
    take,
    include: {
      result: true,
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { name: true, competition: { select: { id: true, name: true, club: { select: { name: true } } } } } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
    },
  });
  return matches.map((m) => {
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    const score = (m.result?.score ?? null) as { sets?: { a: number; b: number }[] } | null;
    const comp = m.stage.category.competition;
    return {
      id: m.id,
      competitionId: comp.id,
      competition: comp.name,
      club: comp.club.name,
      category: m.stage.category.name,
      section: m.stage.type === "GROUPS" ? m.group?.name ?? "Grupos" : m.stage.name,
      nameA: a ? sideName(a) : "—",
      nameB: b ? sideName(b) : "—",
      winner: m.result?.winnerSide ?? null,
      sets: score?.sets ?? null,
      when: m.scheduledAt,
    };
  });
}
