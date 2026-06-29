import { prisma } from "@/lib/prisma";

// Definições globais da plataforma (singleton id=1).
export async function getPlatformSettings() {
  return prisma.platformSettings.findUnique({ where: { id: 1 } });
}
