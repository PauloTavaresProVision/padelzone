"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { playerIdsInScope } from "@/server/messages";

export type MessageState = { error?: string; ok?: boolean } | null;

// Organizador envia uma mensagem (dentro da plataforma) para: todos os jogadores do clube,
// os de um torneio, ou um jogador específico. Aparece no menu Mensagens de cada jogador.
export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada." };
  const club = await getMyClub(userId);
  if (!club) return { error: "Sem clube associado." };

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const target = String(formData.get("competitionId") ?? "all"); // "all" | "<compId>" | "player"
  if (!subject) return { error: "Escreve o assunto." };
  if (!body) return { error: "Escreve a mensagem." };

  let competitionId: number | null = null;
  let audienceLabel = "Todos os jogadores";
  let playerIds: number[];

  if (target === "player") {
    const playerId = Number(formData.get("playerId"));
    const clubPlayers = await playerIdsInScope(club.id, null);
    if (!playerId || !clubPlayers.includes(playerId)) return { error: "Escolhe um jogador válido." };
    const p = await prisma.player.findUnique({ where: { id: playerId }, select: { name: true } });
    audienceLabel = p?.name ? `Jogador: ${p.name}` : "Jogador";
    playerIds = [playerId];
  } else if (target !== "all") {
    competitionId = Number(target);
    const comp = await prisma.competition.findUnique({ where: { id: competitionId }, select: { name: true, clubId: true } });
    if (!comp || comp.clubId !== club.id) return { error: "Torneio inválido." };
    audienceLabel = comp.name;
    playerIds = await playerIdsInScope(club.id, competitionId);
  } else {
    playerIds = await playerIdsInScope(club.id, null);
  }

  if (playerIds.length === 0) return { error: "Ainda não há jogadores nesse âmbito." };

  await prisma.message.create({
    data: {
      clubId: club.id,
      senderUserId: userId,
      competitionId,
      audienceLabel,
      subject,
      body,
      recipients: { create: playerIds.map((playerId) => ({ playerId })) },
    },
  });

  revalidatePath("/admin/mensagens");
  return { ok: true };
}

// Jogador marca uma mensagem como lida.
export async function markMessageRead(recipientId: number) {
  const userId = await getSessionUserId();
  if (!userId) return;
  const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
  if (!player) return;
  await prisma.messageRecipient.updateMany({
    where: { id: recipientId, playerId: player.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/mensagens");
  revalidatePath("/inicio");
}

// Jogador marca TODAS as suas mensagens como lidas (ao abrir o menu Mensagens).
export async function markAllMessagesRead() {
  const userId = await getSessionUserId();
  if (!userId) return;
  const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
  if (!player) return;
  const res = await prisma.messageRecipient.updateMany({ where: { playerId: player.id, readAt: null }, data: { readAt: new Date() } });
  if (res.count > 0) {
    revalidatePath("/mensagens", "layout");
    revalidatePath("/inicio");
  }
}
