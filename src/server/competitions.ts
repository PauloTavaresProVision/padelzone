import { prisma } from "@/lib/prisma";

export function getClubCompetitions(clubId: number) {
  return prisma.competition.findMany({
    where: { clubId },
    include: { _count: { select: { categories: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getCompetition(id: number) {
  return prisma.competition.findUnique({
    where: { id },
    include: {
      club: true,
      categories: {
        include: { _count: { select: { entries: true } } },
        orderBy: { id: "asc" },
      },
      attachments: { orderBy: { id: "asc" } },
    },
  });
}
