import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sideName } from "@/server/draw";
import { TvControls } from "@/components/tv-controls";
import { TvGrid } from "@/components/tv-grid";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const timeKey = (d: Date) => d.toISOString().slice(11, 16);
const fmtDay = (key: string) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" }).format(new Date(key + "T12:00:00Z"));

type Sets = { a: number; b: number }[];

// Quantas faixas horárias mostrar de cada vez (janela à volta do "agora").
const WINDOW = 4;

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
  const allTimes = [...new Set(dayGames.map((g) => timeKey(g.when)))].sort();

  // Janela de horas: à volta do "agora" se for hoje; senão a partir do início do dia.
  const isToday = selDay === todayKey;
  const nowKey = timeKey(new Date());
  let startIdx = 0;
  if (isToday && allTimes.length) {
    let next = allTimes.findIndex((t) => t > nowKey);
    if (next === -1) next = allTimes.length - 1;
    startIdx = Math.max(0, next - 1);
  }
  const times = allTimes.slice(startIdx, startIdx + WINDOW);
  const currentKey = isToday ? allTimes.filter((t) => t <= nowKey).pop() ?? null : null;

  const cells = dayGames
    .filter((g) => times.includes(timeKey(g.when)))
    .map((g) => ({
      id: g.id,
      courtId: g.courtId,
      tk: timeKey(g.when),
      cat: g.cat,
      section: g.section,
      nameA: g.nameA,
      nameB: g.nameB,
      status: g.status,
      sets: g.sets,
      winner: g.winner,
    }));

  const h = await headers();
  const host = h.get("host") ?? "localhost:3010";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicUrl = `${proto}://${host}/public/tournaments/${comp.id}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "linear-gradient(180deg,#ffffff 0%,#f1eefa 100%)" }}>
      {/* Cabeçalho */}
      <header className="pz-gradient flex shrink-0 items-center justify-between gap-6 px-8 py-4 text-white">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid shrink-0 place-items-center rounded-xl bg-white px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo.png" alt="PadelZone" className="h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-extrabold leading-tight">{comp.name}</h1>
            <p className="truncate text-sm text-white/80">{comp.club.name}{comp.club.city ? ` · ${comp.club.city}` : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <div className="text-right">
            <p className="text-xl font-bold capitalize leading-tight">{selDay ? fmtDay(selDay) : "—"}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/85">
              <span className="size-2 animate-pulse rounded-full bg-white" /> Em direto
            </p>
          </div>
          <TvControls refreshSeconds={45} />
        </div>
      </header>

      {/* Grelha campo × hora (com rotação pelos campos) */}
      <main className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
        {cells.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-zinc-900">Sem jogos para mostrar</p>
              <p className="mt-1 text-lg text-muted">Assim que houver jogos agendados, aparecem aqui.</p>
            </div>
          </div>
        ) : (
          <TvGrid courts={courtList} times={times} cells={cells} currentKey={currentKey} />
        )}
      </main>

      {/* Rodapé com dias e QR */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-line bg-surface px-8 py-3">
        <div className="flex items-center gap-3">
          {days.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <a
                  key={d}
                  href={`?day=${d}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${d === selDay ? "pz-gradient text-white" : "bg-surface-soft text-muted hover:text-zinc-900"}`}
                >
                  {new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit" }).format(new Date(d + "T12:00:00Z"))}
                </a>
              ))}
            </div>
          )}
          <p className="text-sm text-soft">Atualiza e roda automaticamente</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-right text-sm font-semibold text-muted">
            Segue no telemóvel<br />
            <span className="font-normal text-soft">aponta a câmara</span>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="size-16 rounded-lg border border-line bg-white p-1" />
        </div>
      </footer>
    </div>
  );
}
