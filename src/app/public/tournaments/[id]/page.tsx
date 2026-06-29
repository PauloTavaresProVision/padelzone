import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  MapPin, CalendarClock, Trophy, Users, Tag, ClipboardList, Clock, Mail, Phone,
  LayoutGrid, ListChecks, CalendarDays, Network, Info, ArrowRight, Swords, FileText,
} from "lucide-react";
import { getCompetition } from "@/server/competitions";
import { getCategoryStages, sideName, entryName } from "@/server/draw";
import { getTournamentMatches, getTournamentEntries } from "@/server/public";
import { clubAccess } from "@/lib/club-access";
import { getT } from "@/lib/i18n-server";
import { formatKz } from "@/lib/money";
import { GENDER_LABEL } from "@/lib/categories";
import { BracketView } from "@/components/bracket-view";
import { GroupsView } from "@/components/groups-view";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PublicShare } from "@/components/public-share";

export const dynamic = "force-dynamic";

type T = (s: string) => string;

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Inscrições abertas", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-primary-light text-brand-purple" },
  FINISHED: { label: "Terminado", cls: "bg-surface-soft text-muted" },
};
const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: "Eliminatórias",
  GROUPS: "Fase de grupos / Liga",
  GROUPS_KNOCKOUT: "Grupos + Eliminatórias",
};
const TABS = [
  { key: "visao", label: "Visão geral", icon: LayoutGrid },
  { key: "categorias", label: "Categorias", icon: ListChecks },
  { key: "jogos", label: "Jogos", icon: CalendarDays },
  { key: "quadros", label: "Quadros", icon: Network },
  { key: "resultados", label: "Resultados", icon: Trophy },
  { key: "info", label: "Informações", icon: Info },
];

const dateFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
const dayLong = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" });
const dayShort = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
const dtFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
function fmtRange(a: Date | null, b: Date | null, t: T) {
  if (!a) return t("Datas a anunciar");
  return b ? `${dateFmt.format(a)} – ${dateFmt.format(b)}` : dateFmt.format(a);
}
function roundLabel(round: number, total: number) {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Meias-finais";
  if (fromEnd === 2) return "Quartos de final";
  if (fromEnd === 3) return "Oitavos de final";
  return `${round + 1}ª ronda`;
}
function koFraction(round: number, total: number) {
  const fromEnd = total - 1 - round;
  return fromEnd === 0 ? "Final" : `1/${2 ** fromEnd} Final`;
}

type Stage = Awaited<ReturnType<typeof getCategoryStages>>[number];

function BracketFromStage({ stage }: { stage: Stage }) {
  const ms = stage.matches;
  const total = ms.length ? Math.max(...ms.map((m) => m.round)) + 1 : 0;
  const numberOf = new Map<number, number>();
  ms.forEach((m, i) => numberOf.set(m.id, i + 1));
  const roundsMap = new Map<number, typeof ms>();
  for (const m of ms) {
    const arr = roundsMap.get(m.round) ?? [];
    arr.push(m);
    roundsMap.set(m.round, arr);
  }
  const rounds = [...roundsMap.entries()].sort((a, b) => a[0] - b[0]).map(([round, list]) => ({
    round,
    label: roundLabel(round, total),
    matches: list.map((m) => {
      const a = m.sides.find((s) => s.side === "A");
      const b = m.sides.find((s) => s.side === "B");
      const ws = m.result?.winnerSide ?? null;
      const toSide = (s: typeof a, key: "A" | "B") =>
        s ? { name: sideName(s), muted: !s.team && s.players.length === 0, winner: m.status === "DONE" && ws === key } : { name: "—", muted: true, winner: false };
      return { number: numberOf.get(m.id)!, a: toSide(a, "A"), b: toSide(b, "B"), done: m.status === "DONE" };
    }),
  }));
  return <BracketView rounds={rounds} />;
}

function GroupsFromStage({ stage, qualifyCount }: { stage: Stage; qualifyCount: number }) {
  const blocks = stage.groups.map((g) => ({
    name: g.name,
    standings: stage.standings.filter((s) => s.groupId === g.id).map((s) => ({ name: entryName(s.entry), played: s.played, won: s.won, lost: s.lost, gamesFor: s.gamesFor, gamesAgainst: s.gamesAgainst, points: s.points })).sort((a, b) => (b.played ? b.won / b.played : 0) - (a.played ? a.won / a.played : 0) || (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst)),
    matches: stage.matches.filter((m) => m.groupId === g.id).map((m) => ({ round: m.round, a: sideName(m.sides.find((s) => s.side === "A")!), b: sideName(m.sides.find((s) => s.side === "B")!) })),
  }));
  return <GroupsView groups={blocks} qualifyCount={qualifyCount} />;
}

export default async function PublicTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; cat?: string; day?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const t = await getT();
  const comp = await getCompetition(Number(id));
  if (!comp || !["OPEN", "ONGOING", "FINISHED"].includes(comp.status)) notFound();
  if (!clubAccess(comp.club).live) notFound();

  const tab = TABS.some((tb) => tb.key === sp.tab) ? sp.tab! : "visao";
  const [matches, entries, cats] = await Promise.all([
    getTournamentMatches(comp.id),
    getTournamentEntries(comp.id),
    Promise.all(comp.categories.map(async (c) => ({ cat: c, stages: await getCategoryStages(c.id) }))),
  ]);

  const stageRounds = new Map<number, number>();
  for (const m of matches) stageRounds.set(m.stageId, Math.max(stageRounds.get(m.stageId) ?? 0, m.round + 1));

  function toGame(m: (typeof matches)[number]) {
    const a = m.sides.find((s) => s.side === "A");
    const b = m.sides.find((s) => s.side === "B");
    const score = (m.result?.score ?? null) as { sets?: { a: number; b: number }[] } | null;
    const total = stageRounds.get(m.stageId) ?? 1;
    return {
      id: m.id, cat: m.stage.category.name,
      phase: m.stage.type === "GROUPS" ? m.group?.name ?? t("Grupos") : koFraction(m.round, total),
      nameA: a ? sideName(a) : t("Por definir"), nameB: b ? sideName(b) : t("Por definir"),
      court: m.court?.name ?? null, when: m.scheduledAt as Date | null,
      done: m.status === "DONE", live: m.status === "LIVE",
      sets: score?.sets ?? null, winner: m.result?.winnerSide ?? null,
    };
  }
  const games = matches.map(toGame);
  const totalEntries = comp.categories.reduce((a, c) => a + c._count.entries, 0);
  const scheduled = games.filter((g) => g.when && !g.done);
  const played = games.filter((g) => g.done);
  const drawnCount = cats.filter((c) => c.stages.length > 0).length;

  const entriesByCat = new Map<number, typeof entries>();
  for (const e of entries) entriesByCat.set(e.categoryId, [...(entriesByCat.get(e.categoryId) ?? []), e]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3010";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const pageUrl = `${proto}://${host}/public/tournaments/${comp.id}`;
  const st = STATUS[comp.status] ?? STATUS.FINISHED;

  const url = (q: Record<string, string>) => {
    const s = new URLSearchParams(q).toString();
    return `/public/tournaments/${comp.id}${s ? `?${s}` : ""}`;
  };
  const catNames = comp.categories.map((c) => c.name);
  const firstCat = catNames[0];
  const selCat = sp.cat && catNames.includes(sp.cat) ? sp.cat : firstCat; // 1 categoria de cada vez

  const stats = [
    { icon: Tag, label: t("Categorias"), value: comp.categories.length },
    { icon: Users, label: t("Pares inscritos"), value: totalEntries },
    { icon: CalendarDays, label: t("Jogos agendados"), value: games.filter((g) => g.when).length },
    { icon: Trophy, label: t("Sorteadas"), value: drawnCount },
  ];

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_330px]">
          <div className="min-w-0 space-y-5">
            {/* Herói */}
            <div className="pz-shadow-card relative overflow-hidden rounded-2xl">
              {comp.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comp.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-navy/95 via-brand-navy/85 to-brand-purple/70" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-navy via-brand-navy to-brand-purple" />
              )}
              {/* decoração */}
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand-purple-2/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-12 size-64 rounded-full bg-brand-coral/15 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <div className="relative flex items-start justify-between gap-4 p-6 text-white sm:p-8">
                <div className="min-w-0">
                  <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${comp.status === "OPEN" ? "bg-success-bg text-success" : "bg-white/20 text-white"}`}>{t(st.label)}</span>
                  <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">{comp.name}</h1>
                  <div className="mt-2 space-y-1 text-sm text-white/85">
                    <p className="flex items-center gap-1.5"><MapPin className="size-4" /> {comp.club.name}{comp.club.city ? ` · ${comp.club.city}` : ""}</p>
                    <p className="flex items-center gap-1.5"><CalendarClock className="size-4" /> {fmtRange(comp.startDate, comp.endDate, t)}</p>
                    <p className="flex items-center gap-1.5"><Users className="size-4" /> {totalEntries} {t("pares inscritos")}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {comp.status === "OPEN" && (
                      <Link href="/inscrever" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-purple transition hover:bg-white/90"><ClipboardList className="size-4" /> {t("Inscrever-se")}</Link>
                    )}
                    <PublicShare url={pageUrl} />
                  </div>
                </div>
                {comp.club.logoUrl && (
                  <div className="hidden shrink-0 rounded-xl bg-white p-2 sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={comp.club.logoUrl} alt={comp.club.name} className="size-16 rounded-lg object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-3.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary-light text-brand-purple"><s.icon className="size-4" /></span>
                  <p className="mt-2 text-xl font-bold leading-none text-zinc-900">{s.value}</p>
                  <p className="mt-1 text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Separadores */}
            <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
              {TABS.map((tb) => {
                const active = tab === tb.key;
                return (
                  <Link key={tb.key} href={url(tb.key === "visao" ? {} : { tab: tb.key })} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-brand-purple text-brand-purple" : "border-transparent text-muted hover:text-zinc-900"}`}>
                    <tb.icon className="size-4" /> {t(tb.label)}
                  </Link>
                );
              })}
            </div>

            {/* ---- Visão geral ---- */}
            {tab === "visao" && (
              <div className="space-y-6">
                <section>
                  <PanelHeader title={t("Categorias")} href={url({ tab: "categorias" })} cta={t("Ver todas")} />
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {comp.categories.map((cat) => {
                      const avail = cat.maxEntries ? Math.max(0, cat.maxEntries - cat._count.entries) : null;
                      return (
                        <Link key={cat.id} href={url({ tab: "categorias", cat: cat.name })} className="pz-shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-purple/40">
                          <div>
                            <span className="rounded-lg bg-primary-light px-2 py-0.5 text-sm font-bold text-brand-purple">{cat.name}</span>
                            <p className="mt-1.5 text-xs text-muted">{t(GENDER_LABEL[cat.gender] ?? cat.gender)} · {cat._count.entries} {t("duplas")}</p>
                          </div>
                          {avail != null && <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${avail > 0 ? "bg-success-bg text-success" : "bg-surface-soft text-muted"}`}>{avail > 0 ? `${avail} ${t("vagas")}` : t("Completo")}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </section>

                {scheduled.length > 0 && (
                  <section>
                    <PanelHeader title={t("Próximos jogos")} href={url({ tab: "jogos" })} cta={t("Ver todos")} />
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{scheduled.slice(0, 4).map((g) => <MatchCard key={g.id} g={g} t={t} />)}</div>
                  </section>
                )}

                {played.length > 0 && (
                  <section>
                    <PanelHeader title={t("Resultados recentes")} href={url({ tab: "resultados" })} cta={t("Ver todos")} />
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{played.slice(-4).reverse().map((g) => <MatchCard key={g.id} g={g} t={t} />)}</div>
                  </section>
                )}
              </div>
            )}

            {/* ---- Categorias (1 de cada vez) ---- */}
            {tab === "categorias" && (() => {
              const cat = comp.categories.find((c) => c.name === selCat);
              const list = cat ? entriesByCat.get(cat.id) ?? [] : [];
              const avail = cat?.maxEntries ? Math.max(0, cat.maxEntries - cat._count.entries) : null;
              return (
                <div className="space-y-4">
                  <CatSelector cats={comp.categories.map((c) => ({ name: c.name }))} sel={selCat} hrefFor={(n) => url({ tab: "categorias", cat: n })} t={t} />
                  {!cat ? <Empty>{t("Este torneio ainda não tem categorias.")}</Empty> : (
                    <section className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-soft/40 px-5 py-4">
                        <div>
                          <p className="text-lg font-bold text-zinc-900">{cat.name}</p>
                          <p className="text-xs text-muted">{t(GENDER_LABEL[cat.gender] ?? cat.gender)} · {t(FORMAT_LABEL[cat.format] ?? cat.format)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-zinc-900">{cat._count.entries}</p>
                          <p className="text-xs text-muted">{avail != null ? `${avail} ${t("vagas livres")}` : t("duplas inscritas")}</p>
                        </div>
                      </div>
                      <div className="p-5">
                        {list.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted">{t("Ainda não há duplas inscritas nesta categoria.")}</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {list.map((e, i) => {
                              const p = pairOf(e);
                              return (
                                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-light text-sm font-bold text-brand-purple">{e.seed ?? i + 1}</span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-zinc-900">{p.a}</p>
                                    {p.b && <p className="truncate text-xs text-muted">{p.b}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              );
            })()}

            {/* ---- Jogos (seletor de dia + categoria) ---- */}
            {tab === "jogos" && (() => {
              const jogosCat = sp.cat && catNames.includes(sp.cat) ? sp.cat : "Todas";
              const dayKey = (d: Date) => d.toISOString().slice(0, 10);
              const inCat = jogosCat === "Todas" ? games : games.filter((g) => g.cat === jogosCat);
              const sched = inCat.filter((g) => g.when);
              const days = [...new Set(sched.map((g) => dayKey(g.when!)))].sort();
              const selDay = sp.day && days.includes(sp.day) ? sp.day : days[0];
              const dayGames = sched.filter((g) => dayKey(g.when!) === selDay).sort((a, b) => a.when!.getTime() - b.when!.getTime());
              const pending = inCat.filter((g) => !g.when);
              return (
                <div className="space-y-4">
                  <CatSelector cats={[{ name: "Todas" }, ...comp.categories.map((c) => ({ name: c.name }))]} sel={jogosCat} hrefFor={(n) => (n === "Todas" ? url({ tab: "jogos" }) : url({ tab: "jogos", cat: n }))} t={t} />
                  {days.length === 0 ? (
                    pending.length === 0 ? <Empty>{t("Ainda não há jogos. Aparecem aqui depois do sorteio e do agendamento.")}</Empty> : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{pending.map((g) => <MatchCard key={g.id} g={g} t={t} />)}</div>
                    )
                  ) : (
                    <>
                      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                        {days.map((d) => (
                          <Link key={d} href={url(jogosCat === "Todas" ? { tab: "jogos", day: d } : { tab: "jogos", cat: jogosCat, day: d })} className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold capitalize transition ${d === selDay ? "border-brand-purple bg-primary-light text-brand-purple" : "border-line bg-surface text-muted hover:bg-surface-soft"}`}>
                            {dayShort.format(new Date(d + "T12:00:00Z"))}
                          </Link>
                        ))}
                      </div>
                      <p className="text-sm font-semibold capitalize text-zinc-900">{selDay ? dayLong.format(new Date(selDay + "T12:00:00Z")) : ""}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{dayGames.map((g) => <MatchCard key={g.id} g={g} t={t} />)}</div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ---- Quadros (1 de cada vez) ---- */}
            {tab === "quadros" && (() => {
              const entry = cats.find((c) => c.cat.name === selCat);
              return (
                <div className="space-y-4">
                  <CatSelector cats={cats.map((c) => ({ name: c.cat.name, drawn: c.stages.length > 0 }))} sel={selCat} hrefFor={(n) => url({ tab: "quadros", cat: n })} t={t} />
                  {!entry ? <Empty>{t("Sem categorias.")}</Empty> : <CategoryDraw cat={entry.cat} stages={entry.stages} t={t} />}
                </div>
              );
            })()}

            {/* ---- Resultados ---- */}
            {tab === "resultados" && (() => {
              const resCat = sp.cat && catNames.includes(sp.cat) ? sp.cat : "Todas";
              const list = (resCat === "Todas" ? played : played.filter((g) => g.cat === resCat)).slice().reverse();
              return (
                <div className="space-y-4">
                  <CatSelector cats={[{ name: "Todas" }, ...comp.categories.map((c) => ({ name: c.name }))]} sel={resCat} hrefFor={(n) => (n === "Todas" ? url({ tab: "resultados" }) : url({ tab: "resultados", cat: n }))} t={t} />
                  {list.length === 0 ? <Empty>{t("Ainda não há resultados.")}</Empty> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{list.map((g) => <MatchCard key={g.id} g={g} t={t} />)}</div>}
                </div>
              );
            })()}

            {/* ---- Informações ---- */}
            {tab === "info" && (
              <div className="space-y-4">
                {comp.description && <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5"><h3 className="mb-2 font-bold text-zinc-900">{t("Sobre o torneio")}</h3><p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{comp.description}</p></section>}
                {comp.rules && (
                  <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                    <h3 className="mb-2 font-bold text-zinc-900">{t("Regulamento")}</h3>
                    <div className="rules-content text-sm text-zinc-700" dangerouslySetInnerHTML={{ __html: comp.rules }} />
                  </section>
                )}
                {comp.attachments.length > 0 && (
                  <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                    <h3 className="mb-3 font-bold text-zinc-900">{t("Documentos")}</h3>
                    <ul className="space-y-2">
                      {comp.attachments.map((a) => (
                        <li key={a.id}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-brand-purple hover:underline">
                            <FileText className="size-4 shrink-0" /> {a.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                  <h3 className="mb-3 font-bold text-zinc-900">{t("Datas e inscrições")}</h3>
                  <dl className="space-y-2 text-sm">
                    <Row k={t("Datas da prova")} v={fmtRange(comp.startDate, comp.endDate, t)} />
                    <Row k={t("Abertura das inscrições")} v={comp.regOpenAt ? dtFmt.format(comp.regOpenAt) : "—"} />
                    <Row k={t("Encerramento das inscrições")} v={comp.regCloseAt ? dtFmt.format(comp.regCloseAt) : "—"} />
                  </dl>
                </section>
                <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                  <h3 className="mb-3 font-bold text-zinc-900">{t("Preços por categoria")}</h3>
                  <dl className="space-y-2 text-sm">
                    {comp.categories.map((c) => <Row key={c.id} k={`${c.name} · ${t(GENDER_LABEL[c.gender] ?? c.gender)}`} v={formatKz(c.price == null ? 0 : Number(c.price), { zero: t("Grátis") })} />)}
                  </dl>
                </section>
              </div>
            )}
          </div>

          {/* Barra lateral */}
          <aside className="space-y-5">
            <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-soft">{t("Organizador")}</h3>
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
                  {comp.club.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={comp.club.logoUrl} alt="" className="size-full object-contain" />
                  ) : <Trophy className="size-5 text-soft" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-zinc-900">{comp.club.name}</p>
                  {comp.club.city && <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="size-3" /> {comp.club.city}</p>}
                </div>
              </div>
              {(comp.club.email || comp.club.phone) && (
                <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm text-muted">
                  {comp.club.email && <p className="flex items-center gap-2"><Mail className="size-4 text-soft" /> <span className="truncate">{comp.club.email}</span></p>}
                  {comp.club.phone && <p className="flex items-center gap-2"><Phone className="size-4 text-soft" /> {comp.club.phone}</p>}
                </div>
              )}
            </section>

            <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-soft">{t("Estatísticas")}</h3>
              <dl className="space-y-2 text-sm">
                <Row k={t("Pares inscritos")} v={String(totalEntries)} />
                <Row k={t("Jogos agendados")} v={String(games.filter((g) => g.when).length)} />
                <Row k={t("Jogos terminados")} v={String(played.length)} />
                <Row k={t("Categorias")} v={String(comp.categories.length)} />
                <Row k={t("Sorteadas")} v={String(drawnCount)} />
              </dl>
            </section>

            <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-soft">{t("Inscrições")}</h3>
              <div className="mb-3 flex items-center justify-between"><span className="text-sm text-muted">{t("Estado")}</span><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{t(st.label)}</span></div>
              {comp.regCloseAt && <div className="mb-3 text-sm"><Row k={t("Encerramento")} v={dtFmt.format(comp.regCloseAt)} /></div>}
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-xs font-semibold text-zinc-900">{t("Preço por dupla")}</p>
                <dl className="space-y-1.5 text-sm">
                  {comp.categories.map((c) => <Row key={c.id} k={c.name} v={formatKz(c.price == null ? 0 : Number(c.price), { zero: t("Grátis") })} />)}
                </dl>
              </div>
              {comp.status === "OPEN" && (
                <Link href="/inscrever" className="pz-gradient mt-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"><ClipboardList className="size-4" /> {t("Inscrever-se")}</Link>
              )}
            </section>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

// ---------- componentes ----------
function PanelHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline">{cta} <ArrowRight className="size-3.5" /></Link>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">{children}</p>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-zinc-900">{v}</dd></div>;
}

function CatSelector({ cats, sel, hrefFor, t }: { cats: { name: string; drawn?: boolean }[]; sel: string; hrefFor: (name: string) => string; t: T }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {cats.map((c) => {
        const active = sel === c.name;
        return (
          <Link key={c.name} href={hrefFor(c.name)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${active ? "pz-gradient pz-shadow-soft text-white" : "border border-line bg-surface text-muted hover:bg-surface-soft"}`}>
            {c.drawn != null && <span className={`size-1.5 rounded-full ${active ? "bg-white/80" : c.drawn ? "bg-success" : "bg-soft"}`} />}
            {c.name === "Todas" ? t("Todas") : c.name}
          </Link>
        );
      })}
    </div>
  );
}

type Game = {
  id: number; cat: string; phase: string; nameA: string; nameB: string;
  court: string | null; when: Date | null; done: boolean; live: boolean; sets: { a: number; b: number }[] | null; winner: string | null;
};

function MatchCard({ g, t }: { g: Game; t: T }) {
  return (
    <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-bold text-brand-purple">{g.cat} · {g.phase}</span>
        {g.live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white"><span className="size-1.5 animate-pulse rounded-full bg-white" /> {t("Ao vivo")}</span>
        ) : g.done ? (
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold uppercase text-success">{t("Terminado")}</span>
        ) : g.when ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900"><Clock className="size-3.5 text-soft" /> {timeFmt.format(g.when)}</span>
        ) : (
          <span className="text-[11px] font-medium text-soft">{t("Por agendar")}</span>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className={`flex min-w-0 items-center gap-1.5 truncate text-sm ${g.done && g.winner === "A" ? "font-bold text-zinc-900" : g.done ? "text-soft" : "font-semibold text-zinc-800"}`}>
            {g.done && g.winner === "A" && <Trophy className="size-3.5 shrink-0 text-warning" />}
            <span className="truncate">{g.nameA}</span>
          </p>
          {g.done && g.sets && <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-700">{g.sets.map((s) => s.a).join("  ")}</span>}
        </div>
        <div className="flex items-center gap-2"><div className="h-px flex-1 bg-line" /><span className="text-[10px] font-bold text-soft">VS</span><div className="h-px flex-1 bg-line" /></div>
        <div className="flex items-center justify-between gap-2">
          <p className={`flex min-w-0 items-center gap-1.5 truncate text-sm ${g.done && g.winner === "B" ? "font-bold text-zinc-900" : g.done ? "text-soft" : "font-semibold text-zinc-800"}`}>
            {g.done && g.winner === "B" && <Trophy className="size-3.5 shrink-0 text-warning" />}
            <span className="truncate">{g.nameB}</span>
          </p>
          {g.done && g.sets && <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-700">{g.sets.map((s) => s.b).join("  ")}</span>}
        </div>
      </div>
      {g.court && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-soft">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {g.court}</span>
        </div>
      )}
    </div>
  );
}

function CategoryDraw({ cat, stages, t }: { cat: { name: string; format: string; qualifiersPerGroup: number }; stages: Stage[]; t: T }) {
  const koStage = stages.find((s) => s.type === "KNOCKOUT");
  let champion: string | null = null;
  if (koStage && koStage.matches.length) {
    const maxRound = Math.max(...koStage.matches.map((m) => m.round));
    const final = koStage.matches.find((m) => m.round === maxRound);
    if (final?.status === "DONE" && final.result?.winnerSide) {
      const ws = final.sides.find((s) => s.side === final.result!.winnerSide);
      if (ws) champion = sideName(ws);
    }
  }
  return (
    <section className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-soft/40 px-5 py-4">
        <p className="text-lg font-bold text-zinc-900">{cat.name}</p>
        <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-semibold text-muted">{t(FORMAT_LABEL[cat.format] ?? cat.format)}</span>
      </div>
      <div className="space-y-5 p-5">
        {stages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center"><Swords className="mx-auto size-7 text-soft" /><p className="mt-2 text-sm text-muted">{t("Sorteio por realizar. O quadro aparece aqui assim que for feito.")}</p></div>
        ) : (
          <>
            {champion && <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-bg/50 px-4 py-3"><Trophy className="size-5 shrink-0 text-warning" /><p className="text-sm"><span className="text-muted">{t("Campeão:")}</span> <strong className="text-zinc-900">{champion}</strong></p></div>}
            {stages.map((s) => (
              <div key={s.id}>
                <div className="mb-2 flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand-purple" /><span className="text-xs font-bold uppercase tracking-wide text-soft">{s.name}</span></div>
                {s.type === "KNOCKOUT" ? <BracketFromStage stage={s} /> : <GroupsFromStage stage={s} qualifyCount={cat.format === "GROUPS_KNOCKOUT" ? cat.qualifiersPerGroup : 0} />}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function pairOf(e: { team: { player1: { name: string }; player2: { name: string } | null } | null; player: { name: string } | null }) {
  if (e.team) return { a: e.team.player1.name, b: e.team.player2?.name ?? null };
  return { a: e.player?.name ?? "—", b: null };
}
