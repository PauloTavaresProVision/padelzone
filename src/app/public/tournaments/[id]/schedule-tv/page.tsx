import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sideName } from "@/server/draw";
import { TvControls } from "@/components/tv-controls";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const timeKey = (d: Date) => d.toISOString().slice(11, 16);
const fmtDay = (key: string) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" }).format(new Date(key + "T12:00:00Z"));

type Sets = { a: number; b: number }[];

export default async function ScheduleTvPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const comp = await prisma.competition.findUnique({
    where: { id: Number(id) },
    select: { id: true, name: true, clubId: true, club: { select: { name: true, city: true } } },
  });
  if (!comp) notFound();

  const courts = await prisma.court.findMany({ where: { clubId: comp.clubId }, orderBy: { id: "asc" }, select: { id: true, name: true } });
  const courtList = courts.length ? courts : [{ id: -1, name: "Campo" }];

  const matches = await prisma.match.findMany({
    where: { stage: { category: { competitionId: comp.id } }, scheduledAt: { not: null } },
    orderBy: [{ scheduledAt: "asc" }],
    include: {
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { name: true } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
      result: true,
    },
  });

  const games = matches.map((m) => {
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    const score = (m.result?.score ?? null) as { sets?: Sets } | null;
    return {
      id: m.id,
      cat: m.stage.category.name,
      section: m.stage.type === "GROUPS" ? m.group?.name ?? "Grupos" : m.stage.name,
      nameA: a ? sideName(a) : "—",
      nameB: b ? sideName(b) : "—",
      courtId: m.courtId ?? courtList[0].id,
      when: m.scheduledAt as Date,
      status: m.status,
      sets: score?.sets ?? null,
      winner: m.result?.winnerSide ?? null,
    };
  });

  const days = [...new Set(games.map((g) => dayKey(g.when)))].sort();
  const todayKey = dayKey(new Date());
  const selDay = sp.day && days.includes(sp.day) ? sp.day : days.find((d) => d >= todayKey) ?? days[days.length - 1];
  const dayGames = games.filter((g) => dayKey(g.when) === selDay);
  const times = [...new Set(dayGames.map((g) => timeKey(g.when)))].sort();
  const cell = (courtId: number, tk: string) => dayGames.find((g) => g.courtId === courtId && timeKey(g.when) === tk);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3010";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicUrl = `${proto}://${host}/public/tournaments/${comp.id}/schedule-tv`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="flex min-h-screen flex-col bg-app">
      {/* Cabeçalho */}
      <header className="pz-gradient flex items-center justify-between gap-4 px-8 py-5 text-white">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center rounded-2xl bg-white px-4 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo.png" alt="PadelZone" className="h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">{comp.name}</h1>
            <p className="text-white/80">
              {comp.club.name}
              {comp.club.city ? ` · ${comp.club.city}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xl font-bold capitalize leading-tight">{selDay ? fmtDay(selDay) : "—"}</p>
            <p className="text-sm text-white/70">Calendário ao vivo</p>
          </div>
          <TvControls refreshSeconds={45} />
        </div>
      </header>

      {/* Grelha campo × hora */}
      <main className="flex-1 overflow-auto p-6">
        {dayGames.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-900">Sem jogos agendados</p>
              <p className="mt-1 text-muted">Assim que o calendário for gerado, aparece aqui.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-soft">
                  <th className="sticky left-0 z-10 w-20 border-b border-r border-line bg-surface-soft p-3 text-sm font-bold text-soft">Hora</th>
                  {courtList.map((c) => (
                    <th key={c.id} className="min-w-[220px] border-b border-l border-line p-3 text-center text-lg font-extrabold text-zinc-900">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((tk) => (
                  <tr key={tk} className="align-top">
                    <td className="sticky left-0 z-10 border-r border-t border-line bg-surface p-3 text-lg font-bold text-zinc-900">{tk}</td>
                    {courtList.map((c) => {
                      const g = cell(c.id, tk);
                      if (!g) return <td key={c.id} className="border-l border-t border-line p-2" />;
                      const live = g.status === "LIVE";
                      const done = g.status === "DONE";
                      const setsStr = g.sets?.map((s) => `${s.a}-${s.b}`).join("  ") ?? "";
                      return (
                        <td key={c.id} className="border-l border-t border-line p-2">
                          <div
                            className={`rounded-xl border-l-4 p-3 ${
                              live
                                ? "border-danger bg-danger-bg"
                                : done
                                  ? "border-success bg-success-bg"
                                  : "border-brand-purple bg-primary-light"
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-brand-purple">{g.cat} · {g.section}</span>
                              {live && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                                  <span className="size-1.5 animate-pulse rounded-full bg-white" /> Ao vivo
                                </span>
                              )}
                              {done && <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-bold uppercase text-white">Final</span>}
                            </div>
                            <p className={`truncate text-lg ${done && g.winner === "A" ? "font-extrabold text-zinc-900" : "font-medium text-zinc-800"}`}>{g.nameA}</p>
                            <p className={`truncate text-lg ${done && g.winner === "B" ? "font-extrabold text-zinc-900" : "font-medium text-zinc-800"}`}>{g.nameB}</p>
                            {done && setsStr && <p className="mt-1 font-mono text-base font-bold tabular-nums text-success">{setsStr}</p>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Rodapé com QR */}
      <footer className="flex items-center justify-between gap-4 border-t border-line bg-surface px-8 py-4">
        <div className="flex items-center gap-3">
          {days.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <a
                  key={d}
                  href={`?day=${d}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                    d === selDay ? "pz-gradient text-white" : "bg-surface-soft text-muted hover:text-zinc-900"
                  }`}
                >
                  {new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit" }).format(new Date(d + "T12:00:00Z"))}
                </a>
              ))}
            </div>
          )}
          <p className="text-sm text-soft">Atualiza automaticamente</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-right text-sm font-medium text-muted">
            Segue o torneio
            <br />
            no telemóvel
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="size-16 rounded-lg border border-line bg-white p-1" />
        </div>
      </footer>
    </div>
  );
}
