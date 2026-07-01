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
      sides: { select: { side: true, teamId: true } },
      stage: { select: { category: { select: { id: true, gender: true, latestStart: true } } } },
    },
  });
  if (matches.length === 0) throw new Error("Não há jogos para agendar (faz o sorteio primeiro).");

  // Indisponibilidade por dupla (união das inscrições da equipa). Chave: "YYYY-MM-DD:period".
  const entries = await prisma.entry.findMany({ where: { category: { competitionId }, teamId: { not: null } }, select: { teamId: true, unavailable: true } });
  const teamOff = new Map<number, Set<string>>();
  for (const e of entries) {
    if (!e.teamId || !Array.isArray(e.unavailable)) continue;
    const set = teamOff.get(e.teamId) ?? new Set<string>();
    for (const u of e.unavailable as unknown[]) if (typeof u === "string") set.add(u);
    teamOff.set(e.teamId, set);
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
  const busyTeams = new Map<number, Set<number>>();
  const teamDays = new Map<number, Set<string>>(); // dias já ocupados por cada dupla (máx. 1 jogo/dia)

  // PRESERVAR o que já está agendado (grupos jogados, jogos já marcados): ocupam os seus
  // espaços (para não haver choques) e NÃO se re-agendam. Só agendamos os jogos sem hora.
  const slotByWhen = new Map<number, number>();
  slots.forEach((s, i) => slotByWhen.set(s.when.getTime(), i));
  for (const mt of matches) {
    if (!mt.scheduledAt) continue;
    const day = mt.scheduledAt.toISOString().slice(0, 10);
    const tA = mt.sides.find((s) => s.side === "A")?.teamId ?? null;
    const tB = mt.sides.find((s) => s.side === "B")?.teamId ?? null;
    for (const t of [tA, tB]) if (t) { const s = teamDays.get(t) ?? new Set<string>(); s.add(day); teamDays.set(t, s); }
    const ti = slotByWhen.get(mt.scheduledAt.getTime());
    if (ti != null) {
      const uc = usedCourts.get(ti) ?? new Set<number>(); if (mt.courtId) uc.add(mt.courtId); usedCourts.set(ti, uc);
      const bt = busyTeams.get(ti) ?? new Set<number>(); if (tA) bt.add(tA); if (tB) bt.add(tB); busyTeams.set(ti, bt);
    }
  }

  // Só agendamos os jogos SEM hora. Categorias com limite primeiro (limite mais cedo primeiro).
  const order = matches.filter((mt) => !mt.scheduledAt).map((mt, i) => ({ mt, i }));
  order.sort((a, b) => {
    const ca = catCutoff.get(a.mt.stage.category.id) ?? Infinity;
    const cb = catCutoff.get(b.mt.stage.category.id) ?? Infinity;
    return ca - cb || a.i - b.i;
  });

  const updates: { id: number; courtId: number; when: Date }[] = [];
  const violations: number[] = [];

  for (const { mt: match } of order) {
    const tA = match.sides.find((s) => s.side === "A")?.teamId ?? null;
    const tB = match.sides.find((s) => s.side === "B")?.teamId ?? null;
    const cutoff = catCutoff.get(match.stage.category.id) ?? null;
    const offA = tA ? teamOff.get(tA) : null;
    const offB = tB ? teamOff.get(tB) : null;

    const place = (respect: boolean): boolean => {
      for (let ti = 0; ti < slots.length; ti++) {
        const uc = usedCourts.get(ti) ?? new Set<number>();
        if (uc.size >= courts.length) continue;
        const bt = busyTeams.get(ti) ?? new Set<number>();
        if (tA && bt.has(tA)) continue;
        if (tB && bt.has(tB)) continue;
        if (respect) {
          if (cutoff != null && slots[ti].min > cutoff) continue;
          if (offA?.has(slots[ti].key) || offB?.has(slots[ti].key)) continue;
          // No máximo 1 jogo por dupla por dia (espalha pelos dias, como o PadelTeams).
          if (tA && teamDays.get(tA)?.has(slots[ti].day)) continue;
          if (tB && teamDays.get(tB)?.has(slots[ti].day)) continue;
        }
        const court = courts.find((c) => !uc.has(c.id));
        if (!court) continue;
        const markDay = (t: number) => { const s = teamDays.get(t) ?? new Set<string>(); s.add(slots[ti].day); teamDays.set(t, s); };
        uc.add(court.id); usedCourts.set(ti, uc);
        if (tA) { bt.add(tA); markDay(tA); }
        if (tB) { bt.add(tB); markDay(tB); }
        busyTeams.set(ti, bt);
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
