import { prisma } from "@/lib/prisma";
import { sortCategories } from "@/lib/category-order";

export function getClubCompetitions(clubId: number) {
  return prisma.competition.findMany({
    where: { clubId },
    include: { _count: { select: { categories: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompetition(id: number) {
  const comp = await prisma.competition.findUnique({
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
  if (comp) comp.categories = sortCategories(comp.categories);
  return comp;
}
