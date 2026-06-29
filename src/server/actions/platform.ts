"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { sendWesender } from "@/lib/wesender";

async function requireMaster() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Sem permissão de master.");
  return user;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

export type SmtpState = { error?: string; ok?: string } | null;

export async function saveSmtp(_prev: SmtpState, formData: FormData): Promise<SmtpState> {
  await requireMaster();
  const password = str(formData, "smtpPassword");
  const data = {
    smtpHost: str(formData, "smtpHost"),
    smtpPort: Number(formData.get("smtpPort")) || null,
    smtpSecure: formData.get("smtpSecure") === "on",
    smtpUser: str(formData, "smtpUser"),
    smtpFromName: str(formData, "smtpFromName"),
    smtpFromEmail: str(formData, "smtpFromEmail"),
  };
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    // Só sobrescreve a password se for indicada (deixar em branco mantém a atual).
    update: { ...data, ...(password ? { smtpPassword: password } : {}) },
    create: { id: 1, ...data, smtpPassword: password },
  });
  revalidatePath("/master/definicoes");
  return { ok: "Definições de email guardadas." };
}

export async function sendTestEmail(_prev: SmtpState, formData: FormData): Promise<SmtpState> {
  await requireMaster();
  const to = String(formData.get("to") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { error: "Indica um email de destino válido." };
  try {
    await sendMail({
      to,
      subject: "Email de teste · PadelZone",
      html: "<p>Este é um email de teste do PadelZone.</p><p>Se o recebeste, o envio de email está configurado corretamente.</p>",
    });
    return { ok: `Email de teste enviado para ${to}.` };
  } catch (e) {
    return { error: `Falha ao enviar: ${e instanceof Error ? e.message : "erro desconhecido"}. Guarda as definições primeiro.` };
  }
}

export async function saveWesender(_prev: SmtpState, formData: FormData): Promise<SmtpState> {
  await requireMaster();
  const key = str(formData, "wesenderApiKey");
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    // Só sobrescreve a chave se for indicada (em branco mantém a atual).
    update: { ...(key ? { wesenderApiKey: key } : {}) },
    create: { id: 1, wesenderApiKey: key },
  });
  revalidatePath("/master/definicoes");
  return { ok: "Chave do WeSender guardada." };
}

export async function sendTestMessage(_prev: SmtpState, formData: FormData): Promise<SmtpState> {
  await requireMaster();
  const to = String(formData.get("to") ?? "").trim();
  if (to.replace(/\D/g, "").length < 9) return { error: "Indica um número de telefone válido." };
  try {
    const r = await sendWesender([to], "Mensagem de teste do PadelZone. O teu WeSender está a funcionar! 🎾");
    return { ok: r.Mensagem || `Mensagem enviada para ${to}.` };
  } catch (e) {
    return { error: `Falha ao enviar: ${e instanceof Error ? e.message : "erro desconhecido"}. Guarda a chave primeiro.` };
  }
}
