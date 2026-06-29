import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWesender, isMessagingConfigured } from "@/lib/wesender";
import { notifyEmail } from "@/lib/email";

// Notifica um conjunto de jogadores por WhatsApp/SMS (WeSender) e por email. Best-effort:
// só envia pelos canais configurados e nunca lança (não bloqueia o fluxo principal).
export async function notifyPlayers(playerIds: (number | null | undefined)[], message: string, subject = "PadelZone") {
  const ids = [...new Set(playerIds.filter((x): x is number => !!x))];
  if (!ids.length) return;
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { phone: true, user: { select: { email: true } } },
  });
  const phones = [...new Set(players.map((p) => p.phone).filter((p): p is string => !!p))];
  if (phones.length) {
    try {
      if (await isMessagingConfigured()) await sendWesender(phones, message);
    } catch {
      /* ignora falha de envio */
    }
  }
  const htmlBody = `<p>${message.replace(/\n/g, "<br>")}</p>`;
  for (const p of players) {
    if (p.user?.email) await notifyEmail(p.user.email, subject, htmlBody);
  }
}
