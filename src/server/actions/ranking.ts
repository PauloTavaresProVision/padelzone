"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { awardCategoryPoints } from "@/server/ranking-engine";

export async function finalizeCompetition(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));

  const comp = await prisma.competition.findUnique({
    where: { id },
    include: { club: { select: { slug: true } }, categories: { select: { id: true } } },
  });
  if (!comp) throw new Error("Competição não encontrada.");

  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: comp.clubId, userId } } });
  if (!m || !["CLUB_OWNER", "DIRECTOR"].includes(m.role)) throw new Error("Sem permissão.");

  // Só atribui uma vez (na transição para FINISHED).
  if (comp.status !== "FINISHED") {
    for (const c of comp.categories) await awardCategoryPoints(c.id);
    await prisma.competition.update({ where: { id }, data: { status: "FINISHED" } });
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/ranking");
}
