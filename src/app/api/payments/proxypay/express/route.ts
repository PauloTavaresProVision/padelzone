import { prisma } from "@/lib/prisma";
import { getExpressTransaction } from "@/server/proxypay";
import { confirmPaymentPaid } from "@/server/payments-core";

// Callback do Multicaixa Express. Numa cobrança (charge), o corpo é a transação resultante,
// com `charge_id` (a nossa referência) e `status`. O OPG não assina, por isso reconfirmamos
// o estado via GET (server-to-server) antes de marcar como pago.
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: { id?: string; charge_id?: string; status?: string } = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  const externalId = payload.charge_id ?? payload.id;
  if (!externalId) return new Response("ok", { status: 200 });

  const row = await prisma.payment.findFirst({
    where: { externalId: String(externalId) },
    include: { club: { select: { mcxExpressToken: true, proxypaySandbox: true } } },
  });
  if (!row) return new Response("ok (sem correspondência)", { status: 200 });

  const token = row.club.mcxExpressToken;
  let status = payload.status;
  if (token && payload.id) {
    try {
      const tx = await getExpressTransaction({ token, sandbox: row.club.proxypaySandbox }, String(payload.id));
      status = tx.status ?? status;
    } catch {}
  }

  if (status === "accepted") {
    await confirmPaymentPaid(row.id);
  } else if (status === "rejected") {
    await prisma.payment.update({ where: { id: row.id }, data: { status: "FAILED" } });
  }
  return new Response("ok", { status: 200 });
}
