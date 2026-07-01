import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWesender, isMessagingConfigured } from "@/lib/wesender";
import { notifyEmail } from "@/lib/email";

export type NotifyEvent = "registration" | "payment" | "result" | "schedule";

export type NotifyChannels = { enabled: boolean; email: boolean; sms: boolean; whatsapp: boolean };

// Por defeito: notifica por email (grátis, conta da plataforma). SMS/WhatsApp o clube ativa.
export const DEFAULT_NOTIFY: NotifyChannels = { enabled: true, email: true, sms: false, whatsapp: false };

export const NOTIFY_EVENTS: { key: NotifyEvent; label: string }[] = [
  { key: "registration", label: "Inscrição confirmada" },
  { key: "payment", label: "Pagamento recebido" },
  { key: "result", label: "Resultado registado" },
  { key: "schedule", label: "Jogo agendado" },
];

export function resolvePrefs(raw: unknown, event: NotifyEvent): NotifyChannels {
  const all = (raw && typeof raw === "object" ? raw : {}) as Record<string, Partial<NotifyChannels>>;
  return { ...DEFAULT_NOTIFY, ...(all[event] ?? {}) };
}

// Notifica jogadores conforme as preferências do clube (evento + canais).
// Best-effort: nunca lança (não bloqueia o fluxo principal). Email sai pela conta da
// plataforma; SMS pela chave WeSender do clube (ou da plataforma, em falta).
export async function notifyPlayers(opts: {
  clubId: number;
  event: NotifyEvent;
  playerIds: (number | null | undefined)[];
  message: string;
  subject?: string;
}) {
  const { clubId, event, playerIds, message, subject = "PadelZone" } = opts;
  const ids = [...new Set(playerIds.filter((x): x is number => !!x))];
  if (!ids.length) return;

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { notifyPrefs: true } });
  const prefs = resolvePrefs(club?.notifyPrefs, event);
  if (!prefs.enabled) return;

  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { phone: true, user: { select: { email: true } } },
  });

  if (prefs.sms) {
    const phones = [...new Set(players.map((p) => p.phone).filter((p): p is string => !!p))];
    if (phones.length) {
      try {
        if (await isMessagingConfigured(clubId)) await sendWesender(phones, message, { clubId });
      } catch {
        /* ignora falha de envio */
      }
    }
  }

  // WhatsApp: canal ainda por ligar.

  if (prefs.email) {
    const htmlBody = `<p>${message.replace(/\n/g, "<br>")}</p>`;
    for (const p of players) {
      if (p.user?.email) await notifyEmail(p.user.email, subject, htmlBody);
    }
  }
}
