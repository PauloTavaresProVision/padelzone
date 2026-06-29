"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { headers } from "next/headers";
import { createReference, fetchPayments, ackPayment, requestExpressPayment, getExpressTransaction, type ProxyPayConfig, type OpgConfig } from "@/server/proxypay";
import { confirmPaymentPaid } from "@/server/payments-core";

async function requireClub() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const my = await getMyClub(userId);
  if (!my) throw new Error("Sem clube.");
  const club = await prisma.club.findUnique({ where: { id: my.id } });
  if (!club) throw new Error("Sem clube.");
  return club;
}

function configOf(club: { proxypayApiKey: string | null; proxypaySandbox: boolean }): ProxyPayConfig {
  if (!club.proxypayApiKey) throw new Error("Configura primeiro a chave da ProxyPay.");
  return { apiKey: club.proxypayApiKey, sandbox: club.proxypaySandbox };
}

export async function savePaymentConfig(formData: FormData) {
  const club = await requireClub();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const expressToken = String(formData.get("expressToken") ?? "").trim();
  const posRaw = String(formData.get("posId") ?? "").trim();
  const referenceEnabled = formData.get("referenceEnabled") === "on";
  const expressEnabled = formData.get("expressEnabled") === "on";
  await prisma.club.update({
    where: { id: club.id },
    data: {
      referenceEnabled,
      expressEnabled,
      paymentsEnabled: referenceEnabled || expressEnabled,
      proxypaySandbox: formData.get("proxypaySandbox") === "on",
      proxypayEntityId: String(formData.get("entityId") ?? "").trim() || null,
      mcxPosId: posRaw ? Number(posRaw) : null,
      ...(apiKey ? { proxypayApiKey: apiKey } : {}),
      ...(expressToken ? { mcxExpressToken: expressToken } : {}),
    },
  });
  revalidatePath("/admin/pagamentos");
}

// Gera referências Multicaixa para inscrições confirmadas, com preço, ainda sem pagamento (limite por clique).
export async function generateReferences() {
  const club = await requireClub();
  if (!club.referenceEnabled) throw new Error("Ativa a Referência Multicaixa nas definições de pagamento.");
  if (!club.proxypayEntityId) throw new Error("Define a Entidade da ProxyPay primeiro.");
  const cfg = configOf(club);

  const entries = await prisma.entry.findMany({
    where: {
      status: "CONFIRMED",
      payments: { none: {} },
      category: { competition: { clubId: club.id }, price: { gt: 0 } },
    },
    include: { category: { select: { price: true, competitionId: true } } },
    take: 20,
  });

  const endDatetime = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  for (const e of entries) {
    const amount = Number(e.category.price);
    const referenceId = await createReference(cfg, { amount, endDatetime, customFields: { entry_id: String(e.id) } });
    await prisma.payment.create({
      data: {
        clubId: club.id,
        competitionId: e.category.competitionId,
        entryId: e.id,
        amount,
        method: "REFERENCE",
        status: "PENDING",
        reference: referenceId,
        externalId: referenceId,
      },
    });
  }
  revalidatePath("/admin/pagamentos");
}

// Polling: vai à ProxyPay buscar pagamentos e marca os correspondentes como pagos.
export async function syncPayments() {
  const club = await requireClub();
  if (!club.referenceEnabled) throw new Error("Ativa a Referência Multicaixa nas definições de pagamento.");
  const cfg = configOf(club);
  const payments = await fetchPayments(cfg);
  for (const p of payments) {
    const row = await prisma.payment.findFirst({ where: { clubId: club.id, externalId: String(p.reference_id) } });
    if (!row) continue;
    await confirmPaymentPaid(row.id);
    await ackPayment(cfg, p.id);
  }
  revalidatePath("/admin/pagamentos");
}

// Marcar manualmente como pago (numerário, transferência com comprovativo, etc.).
export async function markPaymentPaid(formData: FormData) {
  const club = await requireClub();
  const paymentId = Number(formData.get("paymentId"));
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, clubId: club.id } });
  if (!payment) throw new Error("Pagamento não encontrado.");
  await confirmPaymentPaid(payment.id);
  revalidatePath("/admin/pagamentos");
}

function opgConfigOf(club: { mcxExpressToken: string | null; proxypaySandbox: boolean }): OpgConfig {
  if (!club.mcxExpressToken) throw new Error("Configura o token Multicaixa Express primeiro.");
  return { token: club.mcxExpressToken, sandbox: club.proxypaySandbox };
}

// Multicaixa Express: envia um pedido de pagamento para o telemóvel do cliente (aprova na app).
export async function chargeExpress(formData: FormData) {
  const club = await requireClub();
  if (!club.expressEnabled) throw new Error("Ativa o Multicaixa Express nas definições de pagamento.");
  if (!club.mcxPosId) throw new Error("Define o POS ID (Multicaixa Express) primeiro.");
  const cfg = opgConfigOf(club);
  const paymentId = Number(formData.get("paymentId"));
  const mobile = String(formData.get("mobile") ?? "").replace(/\D/g, "");
  if (!/^9\d{8}$/.test(mobile)) throw new Error("Número inválido (formato 9XXXXXXXX).");
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, clubId: club.id } });
  if (!payment) throw new Error("Pagamento não encontrado.");

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const callbackUrl = host ? `${proto}://${host}/api/payments/proxypay/express` : undefined;

  const txId = await requestExpressPayment(cfg, { posId: club.mcxPosId, mobile, amount: Number(payment.amount), callbackUrl });
  await prisma.payment.update({ where: { id: payment.id }, data: { method: "MULTICAIXA_EXPRESS", externalId: txId, status: "PENDING" } });
  revalidatePath("/admin/pagamentos");
}

// Verifica o estado de uma cobrança Express (caso o callback ainda não tenha chegado).
export async function checkExpress(formData: FormData) {
  const club = await requireClub();
  const cfg = opgConfigOf(club);
  const paymentId = Number(formData.get("paymentId"));
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, clubId: club.id } });
  if (!payment?.externalId) throw new Error("Sem transação Express para verificar.");
  const tx = await getExpressTransaction(cfg, payment.externalId);
  if (tx.status === "accepted") {
    await confirmPaymentPaid(payment.id);
  } else if (tx.status === "rejected") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
  revalidatePath("/admin/pagamentos");
}
