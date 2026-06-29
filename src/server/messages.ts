import { prisma } from "@/lib/prisma";

// IDs dos jogadores num âmbito: todos os do clube (competitionId null) ou só os de um torneio.
export async function playerIdsInScope(clubId: number, competitionId: number | null) {
  const where = competitionId
    ? { category: { competitionId } }
    : { category: { competition: { clubId } } };
  const entries = await prisma.entry.findMany({
    where,
    select: { playerId: true, team: { select: { player1Id: true, player2Id: true } } },
  });
  const ids = new Set<number>();
  for (const e of entries) {
    if (e.playerId) ids.add(e.playerId);
    if (e.team) {
      ids.add(e.team.player1Id);
      if (e.team.player2Id) ids.add(e.team.player2Id);
    }
  }
  return [...ids];
}

// Torneios do clube (com nº de jogadores) para o organizador escolher o âmbito (além de "Todos").
export async function getMessageAudiences(clubId: number) {
  const comps = await prisma.competition.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  return Promise.all(
    comps.map(async (c) => ({ id: c.id, name: c.name, count: (await playerIdsInScope(clubId, c.id)).length })),
  );
}

// Todos os jogadores do clube (para o seletor de mensagem individual) + total.
export async function getClubPlayerScope(clubId: number) {
  const ids = await playerIdsInScope(clubId, null);
  const players = ids.length
    ? await prisma.player.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  return { allCount: ids.length, players };
}

export type ClubMessage = {
  id: number;
  subject: string;
  body: string;
  audienceLabel: string;
  createdAt: Date;
  total: number;
  read: number;
};

// Mensagens enviadas pelo clube, com contagem de destinatários e quantos já leram.
export async function getClubMessages(clubId: number): Promise<ClubMessage[]> {
  const messages = await prisma.message.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: { recipients: { select: { readAt: true } } },
  });
  return messages.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    audienceLabel: m.audienceLabel,
    createdAt: m.createdAt,
    total: m.recipients.length,
    read: m.recipients.filter((r) => r.readAt != null).length,
  }));
}

export type InboxMessage = {
  id: number; // id do MessageRecipient
  subject: string;
  body: string;
  club: string;
  clubLogo: string | null;
  createdAt: Date;
  read: boolean;
};

// Mensagens recebidas por um jogador (das mais recentes para as mais antigas).
export async function getMyMessages(userId: number): Promise<InboxMessage[]> {
  const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
  if (!player) return [];
  const recs = await prisma.messageRecipient.findMany({
    where: { playerId: player.id },
    orderBy: { message: { createdAt: "desc" } },
    include: { message: { include: { club: { select: { name: true, logoUrl: true } } } } },
  });
  return recs.map((r) => ({
    id: r.id,
    subject: r.message.subject,
    body: r.message.body,
    club: r.message.club.name,
    clubLogo: r.message.club.logoUrl,
    createdAt: r.message.createdAt,
    read: r.readAt != null,
  }));
}

// Nº de mensagens por ler de um jogador (para o badge do menu).
export async function getUnreadMessageCount(userId: number): Promise<number> {
  const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
  if (!player) return 0;
  return prisma.messageRecipient.count({ where: { playerId: player.id, readAt: null } });
}
