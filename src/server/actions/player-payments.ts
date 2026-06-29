"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { createReference, createCharge, getCharge, getExpressTransaction, mockChargeTransaction } from "@/server/proxypay";
import { confirmPaymentPaid } from "@/server/payments-core";

async function loadOwnedEntry(entryId: number, userId: number) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (!player) throw new Error("Sem jogador.");
  const teams = await prisma.team.findMany({ where: { OR: [{ player1Id: player.id }, { player2Id: player.id }] }, select: { id: true } });
  const teamIds = teams.map((t) => t.id);
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, OR: [{ playerId: player.id }, { teamId: { in: teamIds } }] },
    include: { category: { include: { competition: { include: { club: true } } } }, payments: true },
  });
  if (!entry) throw new Error("Inscrição não encontrada.");
  return entry;
}

// Bloqueia o pagamento se a categoria já está cheia (já não há vaga para esta inscrição).
async function assertNotFull(entry: Awaited<ReturnType<typeof loadOwnedEntry>>) {
  const max = entry.category.maxEntries;
  if (max == null) return;
  const confirmed = await prisma.entry.count({ where: { categoryId: entry.categoryId, status: "CONFIRMED" } });
  if (entry.status !== "CONFIRMED" && confirmed >= max) {
    throw new Error("Esta categoria já está cheia. Já não é possível pagar esta inscrição.");
  }
}

function priceOf(entry: Awaited<ReturnType<typeof loadOwnedEntry>>) {
  const price = entry.category.price == null ? 0 : Number(entry.category.price);
  if (price <= 0) throw new Error("Esta inscrição não tem valor a pagar.");
  return price;
}

function demoReference() {
  let s = "";
  for (let i = 0; i < 9; i++) s += Math.floor(Math.random() * 10);
  return s;
}

async function upsertPayment(entry: Awaited<ReturnType<typeof loadOwnedEntry>>, price: number, data: { method: "REFERENCE" | "MULTICAIXA_EXPRESS"; status: "PENDING" | "PAID" | "FAILED"; reference?: string | null; externalId?: string | null }) {
  const existing = entry.payments[0];
  if (existing) return prisma.payment.update({ where: { id: existing.id }, data });
  return prisma.payment.create({
    data: { clubId: entry.category.competition.clubId, competitionId: entry.category.competitionId, entryId: entry.id, amount: price, ...data },
  });
}

// Pagar por Referência Multicaixa (gera a referência; demo se a ProxyPay não estiver configurada).
export async function playerPayReference(entryId: number) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entry = await loadOwnedEntry(entryId, userId);
  await assertNotFull(entry);
  const price = priceOf(entry);
  const club = entry.category.competition.club;

  let reference: string;
  if (club.referenceEnabled && club.proxypayApiKey) {
    reference = await createReference({ apiKey: club.proxypayApiKey, sandbox: club.proxypaySandbox }, { amount: price, customFields: { entry_id: String(entry.id) } });
  } else {
    reference = demoReference(); // modo de demonstração
  }
  await upsertPayment(entry, price, { method: "REFERENCE", status: "PENDING", reference, externalId: reference });
  revalidatePath("/pagamentos");
  revalidatePath("/inscricoes");
}

export type ExpressCharge = { chargeId: string; qrcodeUrl: string; deeplink: string; deeplinkRedirect: string; amount: number; sandbox: boolean };

// Pagar por Multicaixa Express: cria uma cobrança e devolve o QR-Code + deeplink para o ecrã.
export async function playerPayExpress(entryId: number): Promise<ExpressCharge> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entry = await loadOwnedEntry(entryId, userId);
  await assertNotFull(entry);
  const price = priceOf(entry);
  const club = entry.category.competition.club;
  if (!club.expressEnabled || !club.mcxExpressToken || !club.mcxPosId) {
    throw new Error("O Multicaixa Express não está configurado para este clube.");
  }

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  // A ProxyPay recusa um callback_url não acessível externamente (ex.: localhost). Em dev omitimos
  // e confiamos no polling; em produção (domínio público) o callback volta a ser enviado.
  const hostname = host.split(":")[0];
  const isLocal =
    hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || !hostname.includes(".") ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  const callbackUrl = isLocal ? undefined : `${proto}://${host}/api/payments/proxypay/express`;

  const charge = await createCharge(
    { token: club.mcxExpressToken, sandbox: club.proxypaySandbox },
    { posId: club.mcxPosId, amount: price, callbackUrl, idempotencyKey: `pz-entry-${entry.id}-${Date.now()}` },
  );
  await upsertPayment(entry, price, { method: "MULTICAIXA_EXPRESS", status: "PENDING", externalId: charge.id });
  revalidatePath("/pagamentos");
  return { chargeId: charge.id, qrcodeUrl: charge.qrcodeUrl, deeplink: charge.deeplink, deeplinkRedirect: charge.deeplinkRedirect, amount: price, sandbox: club.proxypaySandbox };
}

// SANDBOX apenas: simula o pagamento da cobrança (para testar sem ler o QR num telemóvel).
export async function simulateExpressPayment(entryId: number, accept: boolean): Promise<"paid" | "failed" | "pending"> {
  const userId = await getSessionUserId();
  if (!userId) return "pending";
  const entry = await loadOwnedEntry(entryId, userId);
  const club = entry.category.competition.club;
  const payment = entry.payments[0];
  if (!club.proxypaySandbox || !club.mcxExpressToken || !payment?.externalId) return "pending";
  try {
    await mockChargeTransaction({ token: club.mcxExpressToken, sandbox: true }, payment.externalId, accept ? "accepted" : "rejected");
  } catch {
    return "pending";
  }
  return checkExpressCharge(entryId);
}

// Polling enquanto o QR está no ecrã: verifica a cobrança e confirma o pagamento quando for aceite.
export async function checkExpressCharge(entryId: number): Promise<"paid" | "failed" | "pending"> {
  const userId = await getSessionUserId();
  if (!userId) return "pending";
  let entry: Awaited<ReturnType<typeof loadOwnedEntry>>;
  try {
    entry = await loadOwnedEntry(entryId, userId);
  } catch {
    return "pending";
  }
  const club = entry.category.competition.club;
  const payment = entry.payments[0];
  if (!payment || !payment.externalId || !club.mcxExpressToken) return "pending";

  const cfg = { token: club.mcxExpressToken, sandbox: club.proxypaySandbox };
  try {
    const charge = await getCharge(cfg, payment.externalId);
    if (charge.status !== "used" || !charge.transactionId) return "pending";
    const tx = await getExpressTransaction(cfg, charge.transactionId);
    if (tx.status === "accepted") {
      await confirmPaymentPaid(payment.id);
      revalidatePath("/pagamentos");
      revalidatePath("/inscricoes");
      return "paid";
    }
    if (tx.status === "rejected") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      revalidatePath("/pagamentos");
      return "failed";
    }
  } catch {
    return "pending"; // erro transitório (rede/DNS) — continua a tentar
  }
  return "pending";
}
