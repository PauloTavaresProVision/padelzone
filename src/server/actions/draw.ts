"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { persistKnockout, persistGroups, persistQualifiersFlexible, clearStages } from "@/server/draw-engine";

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
    // GROUPS e GROUPS_KNOCKOUT começam SÓ pela fase de grupos. O quadro de playoffs é
    // gerado DEPOIS dos grupos, com os apurados reais (como no PadelTeams: "Configurar").
    await persistGroups(categoryId, cat.numGroups, cat.useSeeds);
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

// Sorteio manual de empate: troca a dupla apurada (inEntryId) pela dupla empatada
// que ficou de fora (outEntryId), no quadro de apuramento. Só antes de jogar o quadro.
export async function swapQualifier(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const categoryId = Number(formData.get("categoryId"));
  await requireCategory(categoryId, userId);
  const inEntryId = Number(formData.get("inEntryId"));
  const outEntryId = Number(formData.get("outEntryId"));

  const entries = await prisma.entry.findMany({
    where: { id: { in: [inEntryId, outEntryId] } },
    select: { id: true, teamId: true, playerId: true },
  });
  const inE = entries.find((e) => e.id === inEntryId);
  const outE = entries.find((e) => e.id === outEntryId);
  if (!inE || !outE) throw new Error("Duplas não encontradas.");

  const ko = await prisma.stage.findFirst({
    where: { categoryId, type: "KNOCKOUT" },
    orderBy: { order: "desc" },
    include: { matches: { include: { sides: { include: { players: true } } } } },
  });
  if (!ko) throw new Error("Ainda não há quadro de apuramento.");
  if (ko.matches.some((m) => m.status === "DONE")) throw new Error("Já há jogos do quadro jogados; não dá para trocar agora.");

  for (const m of ko.matches) {
    for (const side of m.sides) {
      const isTeam = inE.teamId != null && side.teamId === inE.teamId;
      const isPlayer = inE.playerId != null && side.players.some((p) => p.playerId === inE.playerId);
      if (!isTeam && !isPlayer) continue;
      await prisma.matchSide.update({ where: { id: side.id }, data: { teamId: outE.teamId ?? null } });
      await prisma.matchSidePlayer.deleteMany({ where: { matchSideId: side.id } });
      if (outE.playerId) await prisma.matchSidePlayer.create({ data: { matchSideId: side.id, playerId: outE.playerId } });
      revalidate();
      return;
    }
  }
  throw new Error("Dupla a substituir não está no quadro.");
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
