import { prisma } from "@/lib/prisma";
import { verifySignature } from "@/server/proxypay";
import { confirmPaymentPaid } from "@/server/payments-core";

// Webhook da ProxyPay: recebe a notificação de pagamento e marca o Payment como pago.
// Responder sempre 2xx quando tratado (a ProxyPay repete em caso de erro).
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: { id?: number; reference_id?: number } = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  if (!payload.reference_id) return new Response("ok", { status: 200 });

  const row = await prisma.payment.findFirst({
    where: { externalId: String(payload.reference_id) },
    include: { club: { select: { proxypayApiKey: true } } },
  });
  if (!row) return new Response("ok (sem correspondência)", { status: 200 });

  const apiKey = row.club.proxypayApiKey;
  if (!apiKey || !verifySignature(raw, req.headers.get("x-signature"), apiKey)) {
    return new Response("assinatura inválida", { status: 400 });
  }

  await confirmPaymentPaid(row.id);
  return new Response("ok", { status: 200 });
}
