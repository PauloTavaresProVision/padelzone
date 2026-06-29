import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyPlayers } from "@/lib/notify";

// Confirma um pagamento (idempotente): marca PAID, confirma a inscrição e notifica os jogadores.
// Usar em TODOS os sítios que confirmam pagamento (ações, simulação, callbacks ProxyPay).
export async function confirmPaymentPaid(paymentId: number) {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { entry: { include: { team: true, category: { select: { competition: { select: { name: true } } } } } } },
  });
  if (!p || p.status === "PAID") return;
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "PAID" } });
  if (p.entryId) await prisma.entry.update({ where: { id: p.entryId }, data: { status: "CONFIRMED" } }).catch(() => {});

  const ids: (number | null)[] = [];
  if (p.entry?.team) ids.push(p.entry.team.player1Id, p.entry.team.player2Id);
  if (p.entry?.playerId) ids.push(p.entry.playerId);
  const comp = p.entry?.category.competition.name ?? "o torneio";
  await notifyPlayers(
    ids,
    `Pagamento recebido. A tua inscrição no torneio "${comp}" está confirmada.`,
    "Pagamento confirmado · PadelZone",
  );
}
