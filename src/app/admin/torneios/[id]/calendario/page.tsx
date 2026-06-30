import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Wand2, CalendarDays, LayoutList, LayoutGrid, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { sideName } from "@/server/draw";
import { updateScheduleSettings, autoSchedule } from "@/server/actions/schedule";
import { ScheduleBoard, type SchedGame } from "@/components/schedule-board";
import { GridGame } from "@/components/grid-game";
import { SaveButton } from "@/components/save-button";
import { TournamentHeader } from "@/components/tournament-header";
import { CalendarTvButtons } from "@/components/calendar-tv-buttons";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const timeKey = (d: Date) => d.toISOString().slice(11, 16);
const fmtDay = (key: string) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" }).format(new Date(key + "T12:00:00Z"));

const fieldS = "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const labelS = "flex flex-col gap-1 text-xs font-medium text-muted";

type G = { id: number; cat: string; section: string; nameA: string; nameB: string; courtId: number | null; when: Date | null; done: boolean };

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; day?: string; agendados?: string; fora?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const courts = await prisma.court.findMany({ where: { clubId: comp.clubId }, orderBy: { id: "asc" }, select: { id: true, name: true } });
  const courtMap = new Map(courts.map((c) => [c.id, c.name]));

  const matches = await prisma.match.findMany({
    where: { stage: { category: { competitionId: comp.id } } },
    orderBy: [{ stageId: "asc" }, { groupId: "asc" }, { round: "asc" }, { slotInRound: "asc" }],
    include: {
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { name: true } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
    },
  });

  const games: G[] = matches.map((m) => {
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    return {
      id: m.id,
      cat: m.stage.category.name,
      section: m.stage.type === "GROUPS" ? m.group?.name ?? "Grupos" : m.stage.name,
      nameA: a ? sideName(a) : "—",
      nameB: b ? sideName(b) : "—",
      courtId: m.courtId ?? null,
      when: m.scheduledAt ?? null,
      done: m.status === "DONE",
    };
  });

  // Cor por categoria (matiz espalhado pelo espectro, estável dentro do torneio).
  const distinctCats = [...new Set(games.map((g) => g.cat))].sort();
  const catColor = (cat: string) => {
    const h = Math.round((Math.max(0, distinctCats.indexOf(cat)) * 360) / Math.max(1, distinctCats.length));
    return { border: `hsl(${h} 65% 45%)`, bg: `hsl(${h} 70% 96%)`, text: `hsl(${h} 55% 30%)` };
  };

  const view = sp.view === "list" ? "list" : "grid";
  const dur = comp.matchDuration || 75;

  const scheduled = games.filter((g) => g.when);
  const doneCount = games.filter((g) => g.done).length;
  const courtsUsed = new Set(scheduled.map((g) => g.courtId).filter(Boolean)).size;

  const days = [...new Set(scheduled.map((g) => dayKey(g.when!)))].sort();
  const selDay = sp.day && days.includes(sp.day) ? sp.day : days[0];
  const dayGames = scheduled.filter((g) => g.when && dayKey(g.when) === selDay);
  const dayTimes = [...new Set(dayGames.map((g) => timeKey(g.when!)))].sort();
  const cell = (courtId: number, tk: string) => dayGames.find((g) => g.courtId === courtId && timeKey(g.when!) === tk);
  const dayIdx = selDay ? days.indexOf(selDay) : -1;

  const schedGames: SchedGame[] = games.map((g, i) => ({
    id: g.id,
    section: `${g.cat} · ${g.section}`,
    sectionOrder: i,
    cat: g.cat,
    color: catColor(g.cat),
    nameA: g.nameA,
    nameB: g.nameB,
    courtId: g.courtId,
    courtName: g.courtId ? courtMap.get(g.courtId) ?? null : null,
    whenValue: g.when ? g.when.toISOString().slice(0, 16) : "",
    whenLabel: g.when
      ? new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(g.when)
      : null,
  }));

  const metrics = [
    { icon: LayoutGrid, label: "Campos em uso", value: `${courtsUsed} de ${courts.length}` },
    { icon: CalendarDays, label: "Jogos agendados", value: `${scheduled.length}` },
    { icon: Clock, label: "Por jogar", value: `${scheduled.length - doneCount}` },
    { icon: CheckCircle2, label: "Terminados", value: `${doneCount}` },
  ];

  const tab = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
      active ? "bg-surface text-brand-purple shadow-sm" : "text-muted hover:text-zinc-900"
    }`;

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Calendário"
        subtitle="Define a duração e o início; gera automaticamente e ajusta."
        help={[
          { label: "Definições", desc: "Define a duração dos jogos e os horários, diferentes para a semana e para o fim de semana." },
          { label: "Gerar automaticamente", desc: "Distribui todos os jogos pelos campos e horas, sem conflitos. Podes ajustar clicando num jogo." },
          { label: "Modo TV", desc: "Abre o calendário num ecrã grande público (com QR e auto-atualização) para mostrar no clube." },
        ]}
      />

      {sp.agendados != null && (
        <div className={`rounded-xl border p-3 text-sm ${Number(sp.fora) > 0 ? "border-warning/30 bg-warning-bg text-warning" : "border-success/30 bg-success-bg text-success"}`}>
          Agendados {sp.agendados} jogos.{Number(sp.fora) > 0
            ? ` ${sp.fora} não respeitaram as preferências de horário ou a disponibilidade e foram agendados na mesma. Ajusta-os manualmente se precisares.`
            : " Todas as preferências de horário e disponibilidade foram respeitadas."}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div key={label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-muted">
              <Icon className="size-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Definições de agendamento + automático */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <form action={updateScheduleSettings} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="competitionId" value={comp.id} />
          <label className={labelS}>Duração (min)<input name="matchDuration" type="number" min={15} defaultValue={dur} className={`${fieldS} w-20`} /></label>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Durante a semana</span>
            <div className="flex items-center gap-1.5">
              <input name="weekdayStart" type="time" defaultValue={comp.weekdayStart} className={fieldS} />
              <span className="text-soft">–</span>
              <input name="weekdayEnd" type="time" defaultValue={comp.weekdayEnd} className={fieldS} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Fim de semana</span>
            <div className="flex items-center gap-1.5">
              <input name="weekendStart" type="time" defaultValue={comp.weekendStart} className={fieldS} />
              <span className="text-soft">–</span>
              <input name="weekendEnd" type="time" defaultValue={comp.weekendEnd} className={fieldS} />
            </div>
          </div>
          <label className={labelS}>Femininas não jogam depois das<input name="femaleLatestStart" type="time" defaultValue={comp.femaleLatestStart ?? ""} className={fieldS} /></label>
          <SaveButton className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">Guardar</SaveButton>
        </form>
        <form action={autoSchedule}>
          <input type="hidden" name="competitionId" value={comp.id} />
          <button className="pz-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-95">
            <Wand2 className="size-4" /> Gerar automaticamente
          </button>
        </form>
      </div>

      {/* Vista + Modo TV */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl bg-surface-soft p-1">
          <Link href="?view=grid" className={tab(view === "grid")}><CalendarDays className="size-4" /> Calendário</Link>
          <Link href="?view=list" className={tab(view === "list")}><LayoutList className="size-4" /> Lista</Link>
        </div>
        <CalendarTvButtons compId={comp.id} />
      </div>

      {/* Legenda de cores por categoria */}
      {distinctCats.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Categorias:</span>
          {distinctCats.map((c) => {
            const col = catColor(c);
            return (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                <span className="size-2 rounded-full" style={{ background: col.border }} /> {c}
              </span>
            );
          })}
        </div>
      )}

      {courts.length === 0 && (
        <p className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
          Este clube ainda não tem campos. Adiciona-os em <strong>Campos</strong>.
        </p>
      )}

      {view === "list" ? (
        <ScheduleBoard games={schedGames} courts={courts} />
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <CalendarDays className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há jogos agendados.</p>
          <p className="text-sm text-soft">Carrega em <strong>Gerar automaticamente</strong> para criar a agenda.</p>
        </div>
      ) : (
        <>
          {/* Navegação por dia */}
          <div className="flex items-center justify-between">
            <DayNav href={dayIdx > 0 ? `?view=grid&day=${days[dayIdx - 1]}` : null} dir="prev" />
            <span className="text-sm font-bold capitalize text-zinc-900">{selDay ? fmtDay(selDay) : ""}</span>
            <DayNav href={dayIdx < days.length - 1 ? `?view=grid&day=${days[dayIdx + 1]}` : null} dir="next" />
          </div>

          {/* Grelha campo × hora */}
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-soft">
                  <th className="sticky left-0 z-10 w-14 border-b border-r border-line bg-surface-soft p-2 text-xs font-semibold text-soft">Hora</th>
                  {courts.map((c) => (
                    <th key={c.id} className="min-w-[150px] border-b border-l border-line p-2 text-center text-xs font-bold text-zinc-900">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayTimes.map((tk) => (
                  <tr key={tk} className="align-top">
                    <td className="sticky left-0 z-10 border-r border-t border-line bg-surface p-2 text-xs font-medium text-muted">{tk}</td>
                    {courts.map((c) => {
                      const g = cell(c.id, tk);
                      return (
                        <td key={c.id} className="border-l border-t border-line p-1">
                          {g && (
                            <GridGame
                              game={{
                                id: g.id,
                                cat: g.cat,
                                section: g.section,
                                nameA: g.nameA,
                                nameB: g.nameB,
                                courtId: g.courtId,
                                whenValue: g.when!.toISOString().slice(0, 16),
                                timeRange: `${tk}–${timeKey(new Date(g.when!.getTime() + dur * 60000))}`,
                                done: g.done,
                              }}
                              courts={courts}
                              color={catColor(g.cat)}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-soft">Para mudar um jogo de campo/hora, clica no jogo ou usa a vista <strong>Lista</strong>.</p>
        </>
      )}
    </div>
  );
}

function DayNav({ href, dir }: { href: string | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  if (!href) {
    return (
      <span className="grid size-9 place-items-center rounded-lg border border-line text-soft">
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link href={href} className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface-soft">
      <Icon className="size-4" />
    </Link>
  );
}
