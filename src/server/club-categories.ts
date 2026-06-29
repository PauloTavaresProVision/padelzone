import { prisma } from "@/lib/prisma";

export function getClubCategories(clubId: number) {
  return prisma.clubCategory.findMany({ where: { clubId }, orderBy: { order: "asc" } });
}
