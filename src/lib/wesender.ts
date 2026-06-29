import "server-only";
import { prisma } from "@/lib/prisma";

// WeSender (Angola) — envio de mensagens (WhatsApp/SMS). Doc: https://www.wesender.co.ao/devs.html
const WESENDER_URL = "https://api.wesender.co.ao/envio/apikey";

export async function getWesenderKey() {
  const s = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  return s?.wesenderApiKey?.trim() || null;
}

export async function isMessagingConfigured() {
  return (await getWesenderKey()) !== null;
}

// WeSender espera números locais de Angola (9 dígitos, ex.: 929000000).
function normalizePhone(p: string) {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("244")) d = d.slice(3);
  return d;
}

export async function sendWesender(phones: string[], message: string) {
  const key = await getWesenderKey();
  if (!key) throw new Error("WeSender não configurado.");
  const Destino = [...new Set(phones.map(normalizePhone).filter((d) => d.length >= 9))];
  if (!Destino.length) throw new Error("Sem números de telefone válidos.");

  const res = await fetch(WESENDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ApiKey: key, Destino, Mensagem: message, CEspeciais: "true" }),
  });
  const data = (await res.json().catch(() => null)) as { Exito?: boolean; Mensagem?: string } | null;
  if (!res.ok || !data?.Exito) throw new Error(data?.Mensagem ?? `WeSender HTTP ${res.status}`);
  return data;
}
