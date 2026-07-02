import { prisma } from "@/lib/prisma";
import { getExpressTransaction } from "@/server/proxypay";
import { confirmPaymentPaid, syncExpressPayment } from "@/server/payments-core";

// Callback do Multicaixa Express. O OPG NÃO assina este pedido, por isso o corpo não é de
// confiança: nunca marcamos como pago pelo `status` que vem no callback. Usamos o callback só
// como sinal para irmos VERIFICAR o estado real à ProxyPay (server-to-server) e agir com base nisso.
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: { id?: string; charge_id?: string } = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  // Fluxo de cobrança (jogador): externalId guardado = charge_id. Verifica via getCharge.
  if (payload.charge_id) {
    const row = await prisma.payment.findFirst({ where: { externalId: String(payload.charge_id) }, select: { id: true } });
    if (row) await syncExpressPayment(row.id);
    return new Response("ok", { status: 200 });
  }

  // Fluxo de transação (pedido iniciado pelo clube): externalId guardado = id da transação.
  if (payload.id) {
    const row = await prisma.payment.findFirst({
      where: { externalId: String(payload.id) },
      include: { club: { select: { mcxExpressToken: true, proxypaySandbox: true } } },
    });
    if (row?.club.mcxExpressToken) {
      try {
        const tx = await getExpressTransaction({ token: row.club.mcxExpressToken, sandbox: row.club.proxypaySandbox }, String(payload.id));
        if (tx.status === "accepted") await confirmPaymentPaid(row.id);
        else if (tx.status === "rejected") await prisma.payment.update({ where: { id: row.id }, data: { status: "FAILED" } });
      } catch {
        // erro transitório — o polling volta a tentar
      }
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
}
