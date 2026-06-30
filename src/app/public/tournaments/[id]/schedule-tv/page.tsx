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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between gap-6 bg-gradient-to-r from-brand-purple to-violet-700 px-10 py-6">
        <div className="flex items-center gap-5">
          <div className="grid place-items-center rounded-2xl bg-white px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo.png" alt="PadelZone" className="h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black leading-none tracking-tight">{comp.name}</h1>
            <p className="mt-1.5 text-lg text-white/75">{comp.club.name}{comp.club.city ? ` · ${comp.club.city}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-3xl font-extrabold capitalize leading-none">{selDay ? fmtDay(selDay) : "—"}</p>
            <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white/70">
              <span className="size-2.5 animate-pulse rounded-full bg-emerald-400" /> Ao vivo
            </p>
          </div>
          <TvControls refreshSeconds={45} />
        </div>
      </header>

      {/* Grelha campo × hora */}
      <main className="flex-1 overflow-auto p-8">
        {dayGames.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <p className="text-4xl font-black text-white">Sem jogos agendados</p>
              <p className="mt-2 text-xl text-white/50">Assim que o calendário for gerado, aparece aqui.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-24 border-b border-white/10 bg-zinc-900 p-4 text-sm font-bold uppercase tracking-wider text-white/40">Hora</th>
                  {courtList.map((c) => (
                    <th key={c.id} className="min-w-[240px] border-b border-l border-white/10 bg-zinc-900 p-4 text-center text-2xl font-black text-white">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((tk, ri) => (
                  <tr key={tk} className="align-top">
                    <td className={`sticky left-0 z-10 border-t border-white/10 p-4 text-center text-3xl font-black text-white ${ri % 2 ? "bg-zinc-900/60" : "bg-zinc-900"}`}>{tk}</td>
                    {courtList.map((c) => {
                      const g = cell(c.id, tk);
                      if (!g) return <td key={c.id} className={`border-l border-t border-white/10 ${ri % 2 ? "bg-zinc-900/20" : "bg-zinc-950"}`} />;
                      const live = g.status === "LIVE";
                      const done = g.status === "DONE";
                      return (
                        <td key={c.id} className={`border-l border-t border-white/10 p-2.5 ${ri % 2 ? "bg-zinc-900/20" : "bg-zinc-950"}`}>
                          <div className={`rounded-2xl border p-4 ${live ? "border-rose-500/60 bg-rose-500/15 shadow-[0_0_30px_-8px_rgba(244,63,94,0.6)]" : done ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                              <span className="rounded-md bg-violet-500/25 px-2 py-0.5 text-sm font-bold text-violet-200">{g.cat} · {g.section}</span>
                              {live && <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-black uppercase"><span className="size-2 animate-pulse rounded-full bg-white" /> Ao vivo</span>}
                              {done && <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-black uppercase">Terminado</span>}
                            </div>
                            <p className={`flex items-center justify-between gap-3 text-2xl ${done && g.winner === "A" ? "font-black text-white" : done ? "text-white/45" : "font-semibold text-white/90"}`}>
                              <span className="truncate">{g.nameA}</span>
                              {done && g.sets && <span className="shrink-0 font-mono tabular-nums">{g.sets.map((s) => s.a).join(" ")}</span>}
                            </p>
                            <p className={`mt-1.5 flex items-center justify-between gap-3 text-2xl ${done && g.winner === "B" ? "font-black text-white" : done ? "text-white/45" : "font-semibold text-white/90"}`}>
                              <span className="truncate">{g.nameB}</span>
                              {done && g.sets && <span className="shrink-0 font-mono tabular-nums">{g.sets.map((s) => s.b).join(" ")}</span>}
                            </p>
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
      <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-zinc-900 px-10 py-5">
        <div className="flex items-center gap-4">
          {days.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <a
                  key={d}
                  href={`?day=${d}`}
                  className={`rounded-xl px-4 py-2 text-base font-bold capitalize transition ${d === selDay ? "bg-brand-purple text-white" : "bg-white/5 text-white/60 hover:text-white"}`}
                >
                  {new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit" }).format(new Date(d + "T12:00:00Z"))}
                </a>
              ))}
            </div>
          )}
          <p className="text-sm text-white/40">Atualiza automaticamente</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-right text-base font-semibold text-white/70">Segue o torneio<br />no telemóvel</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="size-20 rounded-xl bg-white p-1.5" />
        </div>
      </footer>
    </div>
  );
}
