"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { notifyPlayers } from "@/lib/notify";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR", "STAFF"];

export async function scheduleMatch(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const matchId = Number(formData.get("matchId"));

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { stage: { include: { category: { include: { competition: { select: { clubId: true } } } } } } },
  });
  if (!match) throw new Error("Jogo não encontrado.");
  const clubId = match.stage.category.competition.clubId;
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");

  const courtRaw = String(formData.get("courtId") ?? "").trim();
  const whenRaw = String(formData.get("scheduledAt") ?? "").trim();

  let courtId: number | null = courtRaw ? Number(courtRaw) : null;
  if (courtId) {
    const c = await prisma.court.findFirst({ where: { id: courtId, clubId } });
    if (!c) courtId = null;
  }

  await prisma.match.update({
    where: { id: matchId },
    // Tratamos a hora introduzida como "naive" (UTC) para fazer round-trip exato no input.
    data: { courtId, scheduledAt: whenRaw ? new Date(whenRaw + ":00Z") : null },
  });

  // Avisar as duplas do jogo agendado (só no agendamento individual; o automático em massa não envia).
  if (whenRaw) {
    try {
      const full = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          court: { select: { name: true } },
          stage: { select: { category: { select: { name: true, competition: { select: { name: true, clubId: true } } } } } },
          sides: { include: { team: true, players: { select: { playerId: true } } } },
        },
      });
      if (full?.scheduledAt) {
        const ids: (number | null)[] = [];
        for (const s of full.sides) {
          if (s.team) ids.push(s.team.player1Id, s.team.player2Id);
          for (const p of s.players) ids.push(p.playerId);
        }
        const when = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(full.scheduledAt);
        const court = full.court?.name ? ` (${full.court.name})` : "";
        await notifyPlayers({
          clubId: full.stage.category.competition.clubId,
          event: "schedule",
          playerIds: ids,
          message: `O teu jogo (${full.stage.category.name}, ${full.stage.category.competition.name}) está marcado para ${when}${court}.`,
          subject: "Jogo agendado · PadelZone",
        });
      }
    } catch {
      /* notificação não bloqueia */
    }
  }
  revalidatePath("/admin", "layout");
}

export async function updateScheduleSettings(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  const comp = await prisma.competition.findUnique({ where: { id: competitionId }, select: { clubId: true } });
  if (!comp) throw new Error("Competição não encontrada.");
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: comp.clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      matchDuration: Math.max(15, Number(formData.get("matchDuration")) || 75),
      weekdayStart: String(formData.get("weekdayStart") ?? "17:30"),
      weekdayEnd: String(formData.get("weekdayEnd") ?? "23:00"),
      weekendStart: String(formData.get("weekendStart") ?? "08:00"),
      weekendEnd: String(formData.get("weekendEnd") ?? "23:00"),
      femaleLatestStart: String(formData.get("femaleLatestStart") ?? "").trim() || null,
    },
  });
  revalidatePath("/admin", "layout");
}

// Agenda automaticamente TODOS os jogos: distribui pelos campos em slots de `matchDuration`,
// evitando dois jogos no mesmo campo/hora e a mesma dupla em simultâneo. Respeita ainda:
//  - o limite de horário da categoria (próprio, ou o default das categorias femininas);
//  - a indisponibilidade por período de cada dupla (escolhida na inscrição).
// As categorias com limite são agendadas primeiro (apanham as horas cedo). Se um jogo não
// couber dentro das restrições, é agendado à mesma e reportado ao organizador.
const toMin = (s: string) => {
  const [h, mn] = (s || "").split(":").map(Number);
  return Number.isFinite(h) ? (h || 0) * 60 + (mn || 0) : null;
};
const periodOf = (min: number) => (min < 720 ? "morning" : min < 1080 ? "afternoon" : "evening");

export async function autoSchedule(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, clubId: true, startDate: true, matchDuration: true, weekdayStart: true, weekdayEnd: true, weekendStart: true, weekendEnd: true, femaleLatestStart: true },
  });
  if (!comp) throw new Error("Competição não encontrada.");
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: comp.clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");

  const courts = await prisma.court.findMany({ where: { clubId: comp.clubId }, orderBy: { id: "asc" }, select: { id: true } });
  if (courts.length === 0) throw new Error("Adiciona campos ao clube primeiro.");

  const matches = await prisma.match.findMany({
    where: { stage: { category: { competitionId } } },
    orderBy: [{ stageId: "asc" }, { groupId: "asc" }, { round: "asc" }, { slotInRound: "asc" }],
    include: {
      sides: { select: { side: true, teamId: true, players: { select: { playerId: true } } } },
      stage: { select: { category: { select: { id: true, gender: true, latestStart: true } } } },
    },
  });
  if (matches.length === 0) throw new Error("Não há jogos para agendar (faz o sorteio primeiro).");

  // Cada participante (dupla OU jogador individual) tem uma chave estável: "t<teamId>" para
  // duplas, "p<playerId>" para inscrições individuais. Assim o agendador trata as categorias
  // individuais como as de duplas — senão ignorava-as e podia pôr o mesmo jogador em dois campos
  // ao mesmo tempo, além de ignorar a sua indisponibilidade e o limite de 1 jogo/dia.
  const keyForSide = (s: { teamId: number | null; players: { playerId: number }[] }): string[] =>
    s.teamId != null ? [`t${s.teamId}`] : s.players.map((p) => `p${p.playerId}`);

  // Indisponibilidade por participante (união das inscrições). Chave: "YYYY-MM-DD:period".
  const entries = await prisma.entry.findMany({ where: { category: { competitionId } }, select: { teamId: true, playerId: true, unavailable: true } });
  const offByKey = new Map<string, Set<string>>();
  for (const e of entries) {
    const k = e.teamId != null ? `t${e.teamId}` : e.playerId != null ? `p${e.playerId}` : null;
    if (!k || !Array.isArray(e.unavailable)) continue;
    const set = offByKey.get(k) ?? new Set<string>();
    for (const u of e.unavailable as unknown[]) if (typeof u === "string") set.add(u);
    offByKey.set(k, set);
  }

  // Limite de início por categoria: o próprio, ou o default das categorias femininas.
  const femaleDefault = comp.femaleLatestStart ?? null;
  const catCutoff = new Map<number, number | null>();
  for (const mt of matches) {
    const c = mt.stage.category;
    if (catCutoff.has(c.id)) continue;
    const raw = c.latestStart ?? (c.gender === "FEMALE" ? femaleDefault : null);
    catCutoff.set(c.id, raw ? toMin(raw) : null);
  }

  const dur = comp.matchDuration || 75;
  const start = comp.startDate ?? new Date();
  const base = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const needed = matches.length + 1;

  type Slot = { when: Date; min: number; key: string; day: string };
  const slots: Slot[] = [];
  for (let day = 0; day <= 400 && slots.length < needed; day++) {
    const dayMs = base + day * 86400000;
    const dow = new Date(dayMs).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const sMin = toMin(weekend ? comp.weekendStart : comp.weekdayStart) ?? 0;
    const eMin = Math.max(sMin + dur, toMin(weekend ? comp.weekendEnd : comp.weekdayEnd) ?? 0);
    const date = new Date(dayMs).toISOString().slice(0, 10);
    for (let t = sMin; t + dur <= eMin && slots.length < needed; t += dur) {
      slots.push({ when: new Date(dayMs + t * 60000), min: t, key: `${date}:${periodOf(t)}`, day: date });
    }
  }

  const usedCourts = new Map<number, Set<number>>();
  const busyKeys = new Map<number, Set<string>>();
  const dayKeys = new Map<string, Set<string>>(); // dias já ocupados por cada participante (máx. 1 jogo/dia)

  // PRESERVAR o que já está agendado (grupos jogados, jogos já marcados): ocupam os seus
  // espaços (para não haver choques) e NÃO se re-agendam. Só agendamos os jogos sem hora.
  const slotByWhen = new Map<number, number>();
  slots.forEach((s, i) => slotByWhen.set(s.when.getTime(), i));
  for (const mt of matches) {
    if (!mt.scheduledAt) continue;
    const day = mt.scheduledAt.toISOString().slice(0, 10);
    const keys = mt.sides.flatMap(keyForSide);
    for (const k of keys) { const s = dayKeys.get(k) ?? new Set<string>(); s.add(day); dayKeys.set(k, s); }
    const ti = slotByWhen.get(mt.scheduledAt.getTime());
    if (ti != null) {
      const uc = usedCourts.get(ti) ?? new Set<number>(); if (mt.courtId) uc.add(mt.courtId); usedCourts.set(ti, uc);
      const bk = busyKeys.get(ti) ?? new Set<string>(); for (const k of keys) bk.add(k); busyKeys.set(ti, bk);
    }
  }

  // Só agendamos jogos SEM hora e prontos a jogar: exclui os isentos (WALKOVER) e os jogos com
  // lados por definir ("Vencedor Jx"/"Apurado"), que só entram quando ambos os lados forem reais.
  // Categorias com limite primeiro (limite mais cedo primeiro).
  const isRealSide = (s: { teamId: number | null; players: { playerId: number }[] }) => s.teamId != null || s.players.length > 0;
  const order = matches
    .filter((mt) => !mt.scheduledAt && (mt.status === "PENDING" || mt.status === "SCHEDULED") && mt.sides.length >= 2 && mt.sides.every(isRealSide))
    .map((mt, i) => ({ mt, i }));
  order.sort((a, b) => {
    const ca = catCutoff.get(a.mt.stage.category.id) ?? Infinity;
    const cb = catCutoff.get(b.mt.stage.category.id) ?? Infinity;
    return ca - cb || a.i - b.i;
  });

  const updates: { id: number; courtId: number; when: Date }[] = [];
  const violations: number[] = [];

  for (const { mt: match } of order) {
    const keys = match.sides.flatMap(keyForSide);
    const cutoff = catCutoff.get(match.stage.category.id) ?? null;
    const offSets = keys.map((k) => offByKey.get(k)).filter((s): s is Set<string> => !!s);

    const place = (respect: boolean): boolean => {
      for (let ti = 0; ti < slots.length; ti++) {
        const uc = usedCourts.get(ti) ?? new Set<number>();
        if (uc.size >= courts.length) continue;
        const bk = busyKeys.get(ti) ?? new Set<string>();
        if (keys.some((k) => bk.has(k))) continue; // algum participante já ocupado neste slot
        if (respect) {
          if (cutoff != null && slots[ti].min > cutoff) continue;
          if (offSets.some((s) => s.has(slots[ti].key))) continue;
          // No máximo 1 jogo por participante por dia (espalha pelos dias, como o PadelTeams).
          if (keys.some((k) => dayKeys.get(k)?.has(slots[ti].day))) continue;
        }
        const court = courts.find((c) => !uc.has(c.id));
        if (!court) continue;
        uc.add(court.id); usedCourts.set(ti, uc);
        for (const k of keys) {
          bk.add(k);
          const s = dayKeys.get(k) ?? new Set<string>(); s.add(slots[ti].day); dayKeys.set(k, s);
        }
        busyKeys.set(ti, bk);
        updates.push({ id: match.id, courtId: court.id, when: slots[ti].when });
        return true;
      }
      return false;
    };

    if (!place(true) && place(false)) violations.push(match.id);
  }

  await prisma.$transaction(updates.map((u) => prisma.match.update({ where: { id: u.id }, data: { courtId: u.courtId, scheduledAt: u.when } })));
  revalidatePath("/admin", "layout");
  redirect(`/admin/torneios/${competitionId}/calendario?agendados=${updates.length}&fora=${violations.length}`);
}
