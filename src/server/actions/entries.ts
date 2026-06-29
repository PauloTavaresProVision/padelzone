"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, signPlayerInvite } from "@/lib/auth";
import { isMessagingConfigured, sendWesender } from "@/lib/wesender";
import { notifyEmail } from "@/lib/email";

export type EntryState = { error?: string } | null;

const STAFF_ROLES = ["CLUB_OWNER", "DIRECTOR", "STAFF"];

function normPhone(p: string) {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("244")) d = d.slice(3);
  return d;
}

// Procura um jogador pelo telefone — para avisar quando o número já existe ao criar um parceiro novo.
export async function lookupPhone(phone: string): Promise<{ id: number; name: string } | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const target = normPhone(phone);
  if (target.length < 9) return null;
  const all = await prisma.player.findMany({ where: { phone: { not: null } }, select: { id: true, name: true, phone: true } });
  const hit = all.find((p) => p.phone && normPhone(p.phone) === target);
  return hit ? { id: hit.id, name: hit.name } : null;
}

// ---- Inscrição do próprio jogador (com sessão) ----
export async function registerSelf(_prev: EntryState, formData: FormData): Promise<EntryState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Inicia sessão para te inscreveres." };

  const categoryId = Number(formData.get("categoryId"));
  const type = String(formData.get("type") ?? "PAIR");
  const partnerName = String(formData.get("partnerName") ?? "").trim();
  const partnerShirt = String(formData.get("partnerShirt") ?? "").trim();
  const partnerPhone = String(formData.get("partnerPhone") ?? "").trim();
  let unavailable: string[] = [];
  try {
    const a = JSON.parse(String(formData.get("unavailable") ?? "[]"));
    if (Array.isArray(a)) unavailable = a.filter((x) => typeof x === "string").slice(0, 200);
  } catch {}

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { competition: true },
  });
  if (!category) return { error: "Categoria não encontrada." };

  const comp = category.competition;
  if (comp.status !== "OPEN") return { error: "As inscrições desta competição não estão abertas." };
  const now = new Date();
  if (comp.regOpenAt && now < comp.regOpenAt) return { error: "As inscrições ainda não abriram." };
  if (comp.regCloseAt && now > comp.regCloseAt) return { error: "O período de inscrições já terminou." };

  let me = await prisma.player.findUnique({ where: { userId } });
  if (!me) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    me = await prisma.player.create({ data: { userId, name: u?.name ?? "Jogador" } });
  }

  const dup = await prisma.entry.findFirst({
    where: {
      categoryId,
      OR: [{ playerId: me.id }, { team: { OR: [{ player1Id: me.id }, { player2Id: me.id }] } }],
    },
  });
  if (dup) return { error: "Já estás inscrito nesta categoria." };

  const count = await prisma.entry.count({
    where: { categoryId, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  const status = category.maxEntries && count >= category.maxEntries ? "WAITLIST" : "PENDING";

  const price = category.price == null ? 0 : Number(category.price);
  let entryId: number;
  let invite: { phone: string; name: string; playerId: number } | null = null;

  if (type === "PAIR") {
    const partnerId = Number(formData.get("partnerId")) || 0;
    let partnerPlayerId: number;
    let partnerLabel: string;
    if (partnerId) {
      if (partnerId === me.id) return { error: "Não podes ser o teu próprio parceiro." };
      const exists = await prisma.player.findUnique({ where: { id: partnerId }, select: { id: true, name: true } });
      if (!exists) return { error: "Parceiro não encontrado." };
      partnerPlayerId = exists.id;
      partnerLabel = exists.name;
    } else if (partnerName) {
      // Aviso de número já registado (a não ser que confirme "continuar mesmo assim").
      const confirmPhone = String(formData.get("confirmPhone") ?? "") === "1";
      if (partnerPhone && !confirmPhone && normPhone(partnerPhone).length >= 9) {
        const all = await prisma.player.findMany({ where: { phone: { not: null } }, select: { id: true, name: true, phone: true } });
        const existing = all.find((p) => p.phone && normPhone(p.phone) === normPhone(partnerPhone));
        if (existing) return { error: `Este número já tem um jogador registado (${existing.name}). Escolhe esse jogador ou marca “continuar mesmo assim”.` };
      }
      const partner = await prisma.player.create({ data: { name: partnerName, shirtSize: partnerShirt || null, phone: partnerPhone || null, clubId: comp.clubId, invitePending: !!partnerPhone } });
      partnerPlayerId = partner.id;
      partnerLabel = partnerName;
      if (partnerPhone) invite = { phone: partnerPhone, name: partnerName, playerId: partner.id };
    } else {
      return { error: "Escolhe o teu parceiro para a dupla." };
    }
    const team = await prisma.team.create({ data: { name: `${me.name} / ${partnerLabel}`, player1Id: me.id, player2Id: partnerPlayerId } });
    const entry = await prisma.entry.create({ data: { categoryId, teamId: team.id, status: status as never, unavailable: unavailable.length ? unavailable : undefined } });
    entryId = entry.id;
  } else {
    const entry = await prisma.entry.create({ data: { categoryId, playerId: me.id, status: status as never, unavailable: unavailable.length ? unavailable : undefined } });
    entryId = entry.id;
  }

  // Pagamento pendente da inscrição (se a categoria tiver preço).
  if (price > 0) {
    await prisma.payment.create({
      data: { clubId: comp.clubId, competitionId: comp.id, entryId, amount: price, method: "REFERENCE", status: "PENDING" },
    });
  }

  // Convite ao parceiro não registado (WhatsApp/SMS via WeSender). Não bloqueia a inscrição se falhar.
  if (invite && (await isMessagingConfigured())) {
    try {
      const h = await headers();
      const host = h.get("host") ?? "localhost:3010";
      const proto = h.get("x-forwarded-proto") ?? "http";
      const link = `${proto}://${host}/registar?parceiro=${signPlayerInvite(invite.playerId)}`;
      await sendWesender(
        [invite.phone],
        `Olá ${invite.name}! Foste inscrito(a) no torneio "${comp.name}" com ${me.name} no PadelZone. Para continuares na competição cria a tua conta aqui: ${link} . Sem registo não será possível participar.`
      );
    } catch {
      // ignora falha de envio
    }
  }

  // Confirmação por email ao próprio jogador (best-effort).
  const meUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  await notifyEmail(
    meUser?.email,
    "Inscrição confirmada · PadelZone",
    `<p>Olá ${meUser?.name ?? ""},</p><p>A tua inscrição no torneio <strong>${comp.name}</strong> foi registada${price > 0 ? " e está a aguardar pagamento" : ""}.</p>`
  );

  revalidatePath("/inscricoes");
  revalidatePath("/inicio");
  revalidatePath("/pagamentos");
  redirect(price > 0 ? `/pagamentos?pay=${entryId}` : "/inscricoes");
}

// ---- Gestão pelo clube ----
async function requireEntryManager(entryId: number, userId: number) {
  const e = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { category: { include: { competition: { include: { club: { select: { slug: true } } } } } } },
  });
  if (!e) throw new Error("Inscrição não encontrada.");
  const clubId = e.category.competition.clubId;
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !STAFF_ROLES.includes(m.role)) throw new Error("Sem permissão.");
  return e;
}

function revalidateEntry(_e?: unknown) {
  revalidatePath("/admin", "layout");
}

export async function setEntryStatus(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entryId = Number(formData.get("entryId"));
  const status = String(formData.get("status") ?? "PENDING");
  const e = await requireEntryManager(entryId, userId);
  await prisma.entry.update({ where: { id: entryId }, data: { status: status as never } });
  revalidateEntry(e);
}

export async function setSeed(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entryId = Number(formData.get("entryId"));
  const raw = String(formData.get("seed") ?? "").trim();
  const e = await requireEntryManager(entryId, userId);
  await prisma.entry.update({ where: { id: entryId }, data: { seed: raw ? parseInt(raw, 10) : null } });
  revalidateEntry(e);
}

export async function removeEntry(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entryId = Number(formData.get("entryId"));
  const e = await requireEntryManager(entryId, userId);
  await prisma.entry.delete({ where: { id: entryId } });
  revalidateEntry(e);
}
