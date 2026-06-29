"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";

export async function updatePlayer(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const club = await getMyClub(userId);
  if (!club) throw new Error("Sem clube.");

  const playerId = Number(formData.get("playerId"));
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error("Jogador não encontrado.");

  // Permissão: pertence ao clube ou tem inscrição num torneio do clube
  let ok = player.clubId === club.id;
  if (!ok) {
    const e = await prisma.entry.findFirst({
      where: {
        category: { competition: { clubId: club.id } },
        OR: [{ playerId }, { team: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } }],
      },
      select: { id: true },
    });
    ok = !!e;
  }
  if (!ok) throw new Error("Sem permissão.");

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const gender = String(formData.get("gender") ?? "").trim();

  await prisma.player.update({
    where: { id: playerId },
    data: {
      name: String(formData.get("name") ?? player.name).trim() || player.name,
      email: str("email"),
      phone: str("phone"),
      city: str("city"),
      shirtSize: str("shirtSize"),
      gender: (gender ? gender : null) as never,
    },
  });
  revalidatePath("/admin", "layout");
}
