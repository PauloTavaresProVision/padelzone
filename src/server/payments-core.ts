import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyPlayers } from "@/lib/notify";
import { getCharge, getExpressTransaction } from "@/server/proxypay";

// Confirma um pagamento (idempotente): marca PAID, confirma a inscrição e notifica os jogadores.
// Usar em TODOS os sítios que confirmam pagamento (ações, simulação, callbacks ProxyPay).
export async function confirmPaymentPaid(paymentId: number) {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { entry: { include: { team: true, category: { select: { maxEntries: true, competition: { select: { name: true, clubId: true } } } } } } },
  });
  if (!p || p.status === "PAID") return;
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });

  // Trava de lotação ao confirmar: nunca deixar os CONFIRMED passarem do máximo, mesmo que o
  // pagamento chegue por um caminho que não passou pela verificação prévia (webhook, "Pago"
  // manual, ou corrida entre dois a pagar a última vaga). O dinheiro fica registado (PAID);
  // se já não há vaga, a inscrição fica em espera para o clube resolver (transferir ou reembolsar).
  let overCapacity = false;
  if (p.entry && p.entryId && p.entry.status !== "CONFIRMED") {
    const max = p.entry.category?.maxEntries ?? null;
    if (max != null) {
      const confirmed = await prisma.entry.count({
        where: { categoryId: p.entry.categoryId, status: "CONFIRMED", id: { not: p.entryId } },
      });
      overCapacity = confirmed >= max;
    }
    await prisma.entry
      .update({ where: { id: p.entryId }, data: { status: overCapacity ? "WAITLIST" : "CONFIRMED" } })
      .catch(() => {});
  }

  const ids: (number | null)[] = [];
  if (p.entry?.team) ids.push(p.entry.team.player1Id, p.entry.team.player2Id);
  if (p.entry?.playerId) ids.push(p.entry.playerId);
  const comp = p.entry?.category.competition;
  const compName = comp?.name ?? "o torneio";
  if (comp?.clubId) {
    await notifyPlayers({
      clubId: comp.clubId,
      event: "payment",
      playerIds: ids,
      message: overCapacity
        ? `Recebemos o teu pagamento do torneio "${compName}", mas a categoria ficou cheia entretanto. O clube vai contactar-te para resolver (vaga ou reembolso).`
        : `Pagamento recebido. A tua inscrição no torneio "${compName}" está confirmada.`,
      subject: overCapacity ? "Pagamento recebido · PadelZone" : "Pagamento confirmado · PadelZone",
    });
  }
}

// Verifica uma cobrança Multicaixa Express server-to-server (via ProxyPay) e confirma/recusa o
// pagamento em conformidade. NUNCA confia no estado enviado por um callback — vai sempre buscar
// o estado real à ProxyPay. Usada pelo polling e pelo callback (que não é assinado).
export async function syncExpressPayment(paymentId: number): Promise<"paid" | "failed" | "pending"> {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { club: { select: { mcxExpressToken: true, proxypaySandbox: true } } },
  });
  if (!p || !p.externalId || !p.club.mcxExpressToken) return "pending";
  if (p.status === "PAID") return "paid";
  const cfg = { token: p.club.mcxExpressToken, sandbox: p.club.proxypaySandbox };
  try {
    const charge = await getCharge(cfg, p.externalId);
    if (charge.status !== "used" || !charge.transactionId) return "pending";
    const tx = await getExpressTransaction(cfg, charge.transactionId);
    if (tx.status === "accepted") {
      await confirmPaymentPaid(p.id);
      return "paid";
    }
    if (tx.status === "rejected") {
      await prisma.payment.update({ where: { id: p.id }, data: { status: "FAILED" } });
      return "failed";
    }
  } catch {
    // erro transitório (rede/DNS) — fica pendente e tenta-se de novo
  }
  return "pending";
}
