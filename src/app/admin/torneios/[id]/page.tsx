import Link from "next/link";
import { notFound } from "next/navigation";
import { Tags, Users, Shuffle, CalendarClock, Clock, CheckCircle2, MapPin, ArrowRight, ClipboardList, ListChecks, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { sideName } from "@/server/draw";
import { TournamentHeader } from "@/components/tournament-header";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string }> = {
  DRAFT: { label: "Oculto" },
  OPEN: { label: "Em inscrição" },
  ONGOING: { label: "Em curso" },
  FINISHED: { label: "Terminado" },
  CANCELLED: { label: "Cancelado" },
};

const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(d) : null);
const fmtRange = (s: Date | null, e: Date | null) => {
  const a = fmtDate(s), b = fmtDate(e);
  return a && b ? `${a} – ${b}` : a || b || "Datas a anunciar";
};
const fmtWhen = (d: Date) => new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const drawnRows = await prisma.stage.findMany({ where: { category: { competitionId: comp.id } }, select: { categoryId: true }, distinct: ["categoryId"] });
  const drawnSet = new Set(drawnRows.map((s) => s.categoryId));

  const matches = await prisma.match.findMany({
    where: { stage: { category: { competitionId: comp.id } } },
    include: {
      stage: { select: { category: { select: { name: true } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
      result: true,
      court: { select: { name: true } },
    },
  });

  const totalEntries = comp.categories.reduce((a, c) => a + c._count.entries, 0);
  const drawnCount = comp.categories.filter((c) => drawnSet.has(c.id)).length;
  const total = matches.length;
  const done = matches.filter((m) => m.status === "DONE").length;
  const scheduled = matches.filter((m) => m.scheduledAt).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const pair = (m: (typeof matches)[number], side: "A" | "B") => {
    const s = m.sides.find((x) => x.side === side);
    return s ? sideName(s) : "—";
  };
  const proximos = matches
    .filter((m) => m.scheduledAt && m.status !== "DONE")
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())
    .slice(0, 5);
  const ultimos = matches
    .filter((m) => m.status === "DONE" && m.result)
    .sort((a, b) => b.result!.createdAt.getTime() - a.result!.createdAt.getTime())
    .slice(0, 5);

  const metrics = [
    { icon: Tags, value: comp.categories.length, label: "Categorias" },
    { icon: Users, value: totalEntries, label: "Inscrições" },
    { icon: Shuffle, value: `${drawnCount}/${comp.categories.length}`, label: "Sorteadas" },
    { icon: CalendarDays, value: scheduled, label: "Jogos agendados" },
    { icon: Clock, value: scheduled - done, label: "Por jogar" },
    { icon: CheckCircle2, value: done, label: "Terminados" },
  ];

  const actions = [
    { href: `/admin/torneios/${comp.id}/inscricoes`, label: "Inscrições", icon: ClipboardList },
    { href: `/admin/torneios/${comp.id}/sorteio`, label: "Sorteio", icon: Shuffle },
    { href: `/admin/torneios/${comp.id}/calendario`, label: "Calendário", icon: CalendarDays },
    { href: `/admin/torneios/${comp.id}/resultados`, label: "Resultados", icon: ListChecks },
  ];

  const st = STATUS[comp.status] ?? STATUS.DRAFT;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TournamentHeader
        compId={comp.id}
        title="Visão geral"
        help={[{ label: "Resumo do torneio", desc: "Tudo de relance: progresso, próximos jogos, últimos resultados e o estado de cada categoria. Usa o menu à esquerda para gerir cada parte." }]}
      />

      {/* Hero */}
      <div className="pz-gradient relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        {comp.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comp.imageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
        )}
        <div className="relative">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{st.label}</span>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{comp.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" /> {fmtRange(comp.startDate, comp.endDate)}</span>
            {club.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {club.city}</span>}
            <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> {totalEntries} inscrições</span>
          </div>
          <div className="mt-6 max-w-md">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-white/85">Progresso do torneio</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-white/70">{done} de {total} jogos concluídos</p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple">
              <m.icon className="size-[18px]" />
            </span>
            <p className="mt-3 text-2xl font-bold leading-none text-zinc-900">{m.value}</p>
            <p className="mt-1 text-xs text-muted">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Próximos jogos + Últimos resultados */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Próximos jogos</h2>
            <Link href={`/admin/torneios/${comp.id}/calendario`} className="text-xs font-semibold text-brand-purple hover:underline">Ver calendário</Link>
          </div>
          {proximos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Sem jogos agendados. Gera o calendário para os ver aqui.
            </div>
          ) : (
            <ul className="space-y-2">
              {proximos.map((m) => (
                <li key={m.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-primary-light px-2 py-0.5 font-semibold text-brand-purple">{m.stage.category.name}</span>
                    <span className="inline-flex items-center gap-1 text-muted"><CalendarClock className="size-3.5" /> {fmtWhen(m.scheduledAt!)}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-zinc-900">{pair(m, "A")}</p>
                  <p className="truncate text-sm font-medium text-zinc-900">{pair(m, "B")}</p>
                  {m.court && <p className="mt-1 inline-flex items-center gap-1 text-xs text-soft"><MapPin className="size-3" /> {m.court.name}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Últimos resultados</h2>
            <Link href={`/admin/torneios/${comp.id}/resultados`} className="text-xs font-semibold text-brand-purple hover:underline">Ver resultados</Link>
          </div>
          {ultimos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Ainda não há resultados registados.
            </div>
          ) : (
            <ul className="space-y-2">
              {ultimos.map((m) => {
                const win = m.result!.winnerSide;
                const sets = ((m.result!.score ?? {}) as { sets?: { a: number; b: number }[] }).sets ?? [];
                return (
                  <li key={m.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-brand-purple">{m.stage.category.name}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-success">{sets.map((s) => `${s.a}-${s.b}`).join("  ")}</span>
                    </div>
                    <p className={`mt-1.5 truncate text-sm ${win === "A" ? "font-bold text-zinc-900" : "text-muted"}`}>{pair(m, "A")}</p>
                    <p className={`truncate text-sm ${win === "B" ? "font-bold text-zinc-900" : "text-muted"}`}>{pair(m, "B")}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Categorias */}
      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Categorias</h2>
          <Link href={`/admin/torneios/${comp.id}/categorias`} className="text-xs font-semibold text-brand-purple hover:underline">Gerir</Link>
        </div>
        {comp.categories.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há categorias. Adiciona em <Link href={`/admin/torneios/${comp.id}/categorias`} className="font-medium text-brand-purple hover:underline">Categorias</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {comp.categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-lg bg-primary-light px-2 py-1 text-sm font-bold text-brand-purple">{c.name}</span>
                  <span className="text-xs text-muted">{c._count.entries} inscritos</span>
                </div>
                {drawnSet.has(c.id) ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="size-3.5" /> Sorteado</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-semibold text-muted">Por sortear</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="pz-shadow-soft group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-purple/40 hover:bg-surface-soft">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><a.icon className="size-5" /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{a.label}</span>
            <ArrowRight className="size-4 shrink-0 text-soft transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
