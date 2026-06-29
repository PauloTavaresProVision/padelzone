import { prisma } from "@/lib/prisma";

// Patrocinadores ativos (página pública).
export function getActiveSponsors() {
  return prisma.sponsor.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { id: "asc" }] });
}

// Todos os patrocinadores (gestão no master).
export function getAllSponsors() {
  return prisma.sponsor.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
}
