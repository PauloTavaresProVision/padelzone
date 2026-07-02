"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { createReference, createCharge, getCharge, getExpressTransaction, mockChargeTransaction } from "@/server/proxypay";
import { confirmPaymentPaid } from "@/server/payments-core";
import { saveFile } from "@/server/upload";
import { occupiedCount } from "@/server/capacity";

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
  const comp = entry.category.competition;
  // Reserva com prazo: no modo "cancelar", uma reserva expirada já não pode ser paga.
  if (comp.paymentHoldHours && comp.paymentHoldCancel && entry.status !== "CONFIRMED") {
    const expiry = entry.createdAt.getTime() + comp.paymentHoldHours * 3600000;
    if (Date.now() > expiry) throw new Error("A reserva expirou. Volta a inscrever-te para pagar.");
  }
  const max = entry.category.maxEntries;
  if (max == null || entry.status === "CONFIRMED") return;
  // Mesma contagem do registo (confirmados + reservas válidas), excluindo a própria reserva.
  const occupied = await occupiedCount(entry.categoryId, comp.paymentHoldHours ?? null, entry.id);
  if (occupied >= max) {
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

async function upsertPayment(entry: Awaited<ReturnType<typeof loadOwnedEntry>>, price: number, data: { method: "REFERENCE" | "MULTICAIXA_EXPRESS" | "BANK_TRANSFER"; status: "PENDING" | "PAID" | "FAILED"; reference?: string | null; externalId?: string | null; proofUrl?: string | null }) {
  // Nunca mexer numa linha já paga (evita "apagar" um pagamento real ao trocar de método).
  if (entry.payments.some((p) => p.status === "PAID")) {
    throw new Error("Esta inscrição já está paga.");
  }
  const pending = entry.payments.filter((p) => p.status !== "PAID" && p.status !== "REFUNDED");
  // Reutiliza uma linha do MESMO método, ou um placeholder sem compromisso externo (sem
  // referência/cobrança/comprovativo). Se o jogador trocar para outro método quando já há uma
  // referência/cobrança emitida, cria uma linha NOVA e deixa a anterior pendente — assim, se essa
  // referência acabar por ser paga, o webhook ainda a encontra (em vez de perdermos o rasto).
  const target = pending.find((p) => p.method === data.method) ?? pending.find((p) => !p.externalId && !p.reference && !p.proofUrl);
  if (target) return prisma.payment.update({ where: { id: target.id }, data });
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
  let externalId: string | null = null;
  if (club.referenceEnabled && club.proxypayApiKey) {
    reference = await createReference({ apiKey: club.proxypayApiKey, sandbox: club.proxypaySandbox }, { amount: price, customFields: { entry_id: String(entry.id) } });
    externalId = reference; // referência real da ProxyPay (é por aqui que o webhook confirma)
  } else if (process.env.NODE_ENV === "production") {
    // Em produção não inventamos uma referência falsa (nunca seria confirmada — só confundia o jogador).
    throw new Error("O pagamento por referência ainda não está disponível. Escolhe outro método ou fala com o clube.");
  } else {
    reference = demoReference(); // demonstração (dev); externalId fica nulo para o webhook nunca casar
  }
  await upsertPayment(entry, price, { method: "REFERENCE", status: "PENDING", reference, externalId });
  revalidatePath("/pagamentos");
  revalidatePath("/inscricoes");
}

// Pagar por Transferência bancária: anexa o comprovativo; fica pendente até o clube validar.
export async function playerPayTransfer(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const entryId = Number(formData.get("entryId"));
  const entry = await loadOwnedEntry(entryId, userId);
  await assertNotFull(entry);
  const price = priceOf(entry);
  const club = entry.category.competition.club;
  if (!club.transferEnabled) throw new Error("A transferência bancária não está ativa para este clube.");

  const saved = await saveFile(formData.get("proof"), "recibos");
  if (!saved) throw new Error("Anexa o comprovativo da transferência.");

  await upsertPayment(entry, price, { method: "BANK_TRANSFER", status: "PENDING", proofUrl: saved.url, reference: null, externalId: null });
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
  // Ferramenta de teste (sandbox). Em produção fica DESATIVADA, exceto se explicitamente permitida
  // por variável de ambiente — senão um jogador poderia "confirmar" a própria inscrição de graça.
  if (process.env.NODE_ENV === "production" && process.env.PZ_ALLOW_EXPRESS_SIMULATION !== "1") return "pending";
  const userId = await getSessionUserId();
  if (!userId) return "pending";
  const entry = await loadOwnedEntry(entryId, userId);
  const club = entry.category.competition.club;
  const payment = entry.payments.find((p) => p.method === "MULTICAIXA_EXPRESS" && p.externalId && p.status !== "PAID");
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
  const payment = entry.payments.find((p) => p.method === "MULTICAIXA_EXPRESS" && p.externalId && p.status !== "PAID");
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
