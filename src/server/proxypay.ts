import "server-only";
import crypto from "crypto";

// Integração com a ProxyPay (RPS v2) — pagamentos por Referência Multicaixa em Angola.
// Docs: https://developer.proxypay.co.ao/rps/v2/

export type ProxyPayConfig = { apiKey: string; sandbox: boolean };

const baseUrl = (sandbox: boolean) => (sandbox ? "https://api.sandbox.proxypay.co.ao" : "https://api.proxypay.co.ao");

// O host da ProxyPay pode falhar a resolução de DNS de forma intermitente; tenta algumas vezes.
async function fetchRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw lastErr;
}

function headers(apiKey: string, withBody = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Token ${apiKey}`,
    Accept: "application/vnd.proxypay.v2+json",
  };
  if (withBody) h["Content-Type"] = "application/json";
  return h;
}

// 1) reserva um reference_id; 2) cria a referência com o montante e custom_fields.
// Devolve o número de referência (que o cliente usa no Multicaixa).
export async function createReference(
  cfg: ProxyPayConfig,
  opts: { amount: number; endDatetime?: string; customFields?: Record<string, string> },
): Promise<string> {
  const idRes = await fetch(`${baseUrl(cfg.sandbox)}/reference_ids`, { method: "POST", headers: headers(cfg.apiKey) });
  if (!idRes.ok) throw new Error(`ProxyPay: falha ao gerar referência (HTTP ${idRes.status}).`);
  const referenceId = String(await idRes.json()).trim();

  const putRes = await fetch(`${baseUrl(cfg.sandbox)}/references/${referenceId}`, {
    method: "PUT",
    headers: headers(cfg.apiKey, true),
    body: JSON.stringify({
      amount: opts.amount.toFixed(2),
      ...(opts.endDatetime ? { end_datetime: opts.endDatetime } : {}),
      ...(opts.customFields ? { custom_fields: opts.customFields } : {}),
    }),
  });
  if (!putRes.ok && putRes.status !== 204) throw new Error(`ProxyPay: falha ao criar referência (HTTP ${putRes.status}).`);
  return referenceId;
}

// Polling: lista os pagamentos pendentes na conta (alternativa ao webhook).
export type ProxyPayPayment = { id: number; amount: string; reference_id: number; custom_fields?: Record<string, string>; datetime?: string };

export async function fetchPayments(cfg: ProxyPayConfig): Promise<ProxyPayPayment[]> {
  const res = await fetch(`${baseUrl(cfg.sandbox)}/payments`, { headers: headers(cfg.apiKey) });
  if (res.status === 401) throw new Error("ProxyPay: chave de API inválida (HTTP 401).");
  if (!res.ok) throw new Error(`ProxyPay: falha ao obter pagamentos (HTTP ${res.status}).`);
  return res.json();
}

// Confirma o processamento de um pagamento (remove-o da fila da ProxyPay).
export async function ackPayment(cfg: ProxyPayConfig, paymentId: number | string): Promise<void> {
  await fetch(`${baseUrl(cfg.sandbox)}/payments/${paymentId}`, { method: "DELETE", headers: headers(cfg.apiKey) });
}

// Verifica a assinatura HMAC-SHA256 do webhook (header X-Signature, hex minúsculo).
export function verifySignature(rawBody: string, signature: string | null, apiKey: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", apiKey).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- OPG (Multicaixa Express) — pagamento por telemóvel (push para a app). Auth = Bearer.
// Docs: https://developer.proxypay.co.ao/opg/v1/
export type OpgConfig = { token: string; sandbox: boolean };
export type OpgTransaction = { id: string; status?: "accepted" | "rejected"; status_reason?: number | null; amount?: string };

// Inicia um pedido de pagamento; o cliente aprova na app Multicaixa Express. Devolve o id da transação.
export async function requestExpressPayment(
  cfg: OpgConfig,
  opts: { posId: number; mobile: string; amount: number; callbackUrl?: string; idempotencyKey?: string },
): Promise<string> {
  const res = await fetch(`${baseUrl(cfg.sandbox)}/opg/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
      ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      type: "payment",
      pos_id: opts.posId,
      mobile: opts.mobile,
      amount: opts.amount.toFixed(2),
      ...(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}),
    }),
  });
  if (res.status === 401) throw new Error("ProxyPay Express: token inválido (HTTP 401).");
  if (res.status !== 201 && !res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ProxyPay Express: falha ao iniciar (HTTP ${res.status}). ${txt.slice(0, 140)}`);
  }
  const data = (await res.json()) as { id: string };
  return String(data.id);
}

// Consulta o estado de uma transação Express (accepted / rejected / pendente).
export async function getExpressTransaction(cfg: OpgConfig, id: string): Promise<OpgTransaction> {
  const res = await fetchRetry(`${baseUrl(cfg.sandbox)}/opg/v1/transactions/${id}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
  if (!res.ok) throw new Error(`ProxyPay Express: falha ao verificar (HTTP ${res.status}).`);
  return res.json();
}

// --- OPG Charges — cobrança com QR-Code / deeplink para o ecrã do website (cenário recomendado).
// Docs: POST /opg/v1/charges { pos_id, amount, callback_url } -> qrcode_url + deeplink + deeplink_redirect.
export type OpgCharge = {
  id: string;
  amount: string;
  status: "active" | "used" | "expired";
  qrcodeUrl: string;
  deeplink: string;
  deeplinkRedirect: string;
  qrref: string;
  expiresAt: string | null;
  transactionId: string | null;
};

function mapCharge(d: Record<string, unknown>): OpgCharge {
  return {
    id: String(d.id),
    amount: String(d.amount ?? ""),
    status: (d.status as OpgCharge["status"]) ?? "active",
    qrcodeUrl: String(d.qrcode_url ?? ""),
    deeplink: String(d.deeplink ?? ""),
    deeplinkRedirect: String(d.deeplink_redirect ?? ""),
    qrref: String(d.qrref ?? ""),
    expiresAt: d.expires_at ? String(d.expires_at) : null,
    transactionId: d.transaction_id ? String(d.transaction_id) : null,
  };
}

// Cria uma cobrança; devolve o QR-Code (URL de imagem) e o deeplink para a app Multicaixa Express.
export async function createCharge(
  cfg: OpgConfig,
  opts: { posId: number; amount: number; callbackUrl?: string; idempotencyKey?: string },
): Promise<OpgCharge> {
  const res = await fetchRetry(`${baseUrl(cfg.sandbox)}/opg/v1/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      pos_id: opts.posId,
      amount: opts.amount.toFixed(2),
      ...(opts.callbackUrl ? { callback_url: opts.callbackUrl } : {}),
    }),
  });
  if (res.status === 401) throw new Error("Multicaixa Express: token inválido (HTTP 401).");
  if (res.status !== 201 && !res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Multicaixa Express: falha ao criar a cobrança (HTTP ${res.status}). ${t.slice(0, 140)}`);
  }
  return mapCharge(await res.json());
}

// Estado de uma cobrança: active (à espera) / used (paga ou recusada, ver transaction) / expired.
export async function getCharge(cfg: OpgConfig, id: string): Promise<OpgCharge> {
  const res = await fetchRetry(`${baseUrl(cfg.sandbox)}/opg/v1/charges/${id}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Multicaixa Express: falha ao verificar a cobrança (HTTP ${res.status}).`);
  return mapCharge(await res.json());
}

// SANDBOX apenas: simula o pagamento de uma cobrança (accepted / rejected), como se viesse do Multicaixa.
export async function mockChargeTransaction(cfg: OpgConfig, chargeId: string, status: "accepted" | "rejected"): Promise<void> {
  await fetchRetry(`${baseUrl(cfg.sandbox)}/opg/v1/charges/${chargeId}/transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status, ...(status === "rejected" ? { status_reason: 1 } : {}) }),
  });
}
