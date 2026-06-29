import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// Lê o SMTP configurado pelo master. Devolve null se ainda não estiver completo.
export async function getEmailConfig() {
  const s = await prisma.platformSettings.findUnique({ where: { id: 1 } });
  if (!s || !s.smtpHost || !s.smtpPort || !s.smtpFromEmail) return null;
  return s;
}

export async function isEmailConfigured() {
  return (await getEmailConfig()) !== null;
}

// Envio "best-effort" para notificações: só envia se o SMTP estiver configurado e nunca lança.
export async function notifyEmail(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  try {
    if (await isEmailConfigured()) await sendMail({ to, subject, html });
  } catch {
    // notificação não deve bloquear o fluxo principal
  }
}

// Moldura simples e neutra para todos os emails: tipografia limpa + rodapé discreto com a marca.
// Mantém um aspeto profissional e sóbrio (sem emojis nem floreados).
function emailLayout(content: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1e2333;max-width:540px;margin:0 auto">${content}<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #eceef3;color:#9aa0b0;font-size:12px">PadelZone</p></div>`;
}

export async function sendMail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  const s = await getEmailConfig();
  if (!s) throw new Error("Envio de email não configurado (SMTP).");
  // O modo seguro tem de bater certo com a porta, senão dá o erro SSL "wrong version number":
  //  - 465  -> TLS implícito (secure: true)
  //  - 587/25 -> STARTTLS (secure: false; o nodemailer faz o upgrade)
  // Nas portas-padrão a porta manda; só em portas não-standard respeitamos o toggle do master.
  const port = s.smtpPort!;
  const secure = port === 465 ? true : port === 587 || port === 25 ? false : s.smtpSecure;
  const transport = nodemailer.createTransport({
    host: s.smtpHost!,
    port,
    secure,
    requireTLS: !secure, // força STARTTLS (não envia em texto simples) quando não é TLS implícito
    auth: s.smtpUser ? { user: s.smtpUser, pass: s.smtpPassword ?? "" } : undefined,
  });
  const from = s.smtpFromName ? `"${s.smtpFromName}" <${s.smtpFromEmail}>` : s.smtpFromEmail!;
  await transport.sendMail({
    from,
    to,
    subject,
    html: emailLayout(html),
    text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  });
}
