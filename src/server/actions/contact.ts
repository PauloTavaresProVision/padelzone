"use server";

import { prisma } from "@/lib/prisma";

export type ContactState = { error?: string; ok?: boolean } | null;

// Recebe uma mensagem do formulário de contacto público e guarda-a.
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { error: "Indica o teu nome." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Indica um email válido." };
  if (message.length < 5) return { error: "Escreve a tua mensagem." };

  await prisma.contactMessage.create({ data: { name, email, subject: subject || null, message } });
  return { ok: true };
}
