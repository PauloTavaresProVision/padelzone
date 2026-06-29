"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { persistKnockout, persistGroups, persistKnockoutSkeleton, persistQualifiersFlexible, clearStages } from "@/server/draw-engine";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR", "STAFF"];

async function requireCategory(categoryId: number, userId: number) {
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { competition: { select: { clubId: true } } },
  });
  if (!cat) throw new Error("Categoria não encontrada.");
  const m = await prisma.clubUser.findUnique({
    where: { clubId_userId: { clubId: cat.competition.clubId, userId } },
  });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");
  return cat;
}

function revalidate() {
  revalidatePath("/admin", "layout");
}

// Lança o sorteio APLICANDO o formato configurado na categoria (aleatório).
export async function launchDraw(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const categoryId = Number(formData.get("categoryId"));
  const cat = await requireCategory(categoryId, userId);

  if (cat.format === "KNOCKOUT") {
    await persistKnockout(categoryId, cat.useSeeds);
  } else {
    // GROUPS e GROUPS_KNOCKOUT começam pela fase de grupos.
    await persistGroups(categoryId, cat.numGroups, cat.useSeeds);
    if (cat.format === "GROUPS_KNOCKOUT") {
      const confirmed = await prisma.entry.count({ where: { categoryId, status: "CONFIRMED" } });
      const qualifiers = Math.min(confirmed, cat.numGroups * cat.qualifiersPerGroup);
      if (qualifiers >= 2) await persistKnockoutSkeleton(categoryId, qualifiers, 1, "Quadro final");
    }
  }
  revalidate();
}

// 2.ª fase do formato Grupos + Eliminatórias: quadro de apuramento.
export async function generateQualifiers(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const categoryId = Number(formData.get("categoryId"));
  const cat = await requireCategory(categoryId, userId);
  const size = Number(formData.get("size")) || cat.numGroups * cat.qualifiersPerGroup;
  await persistQualifiersFlexible(categoryId, size);
  revalidate();
}

export async function clearDraw(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const categoryId = Number(formData.get("categoryId"));
  await requireCategory(categoryId, userId);
  await clearStages(categoryId);
  revalidate();
}

// Limpa o sorteio de TODAS as categorias da competição (para recomeçar ao vivo).
export async function resetCompetitionDraw(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { categories: { select: { id: true } } },
  });
  if (!comp) throw new Error("Competição não encontrada.");
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: comp.clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");
  for (const c of comp.categories) await clearStages(c.id);
  revalidate();
}
