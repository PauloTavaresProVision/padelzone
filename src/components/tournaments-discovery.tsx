import Link from "next/link";
import { MapPin, CalendarClock, ArrowRight, Trophy, Users } from "lucide-react";
import { getPublicCompetitions } from "@/server/public";
import { GENDER_LABEL } from "@/lib/categories";
import { DiscoveryFilters } from "@/components/discovery-filters";
import { getActiveSponsors } from "@/server/sponsors";
import { getT } from "@/lib/i18n-server";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Inscrições abertas", cls: "bg-success text-white" },
  ONGOING: { label: "Em curso", cls: "bg-brand-purple text-white" },
  FINISHED: { label: "Finalizado", cls: "bg-zinc-700 text-white" },
};
const STATUS_PILLS = [
  { key: "", label: "Todos" },
  { key: "OPEN", label: "Inscrições abertas" },
  { key: "ONGOING", label: "Em curso" },
  { key: "FINISHED", label: "Finalizados" },
];
const dateFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
function fmtRange(a: Date | null, b: Date | null, t: (s: string) => string) {
  if (!a) return t("Datas a anunciar");
  return b ? `${dateFmt.format(a)} – ${dateFmt.format(b)}` : dateFmt.format(a);
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Ecrã de descoberta de torneios (partilhado pelo Início e pela página Torneios).
export async function TournamentsDiscovery({ q, city, gender, status }: { q: string; city: string; gender: string; status: string }) {
  const t = await getT();
  const all = await getPublicCompetitions();
  const sponsors = await getActiveSponsors();
  const cities = [...new Set(all.map((c) => c.club.city).filter((x): x is string => !!x))].sort();

  const pool = all.filter((c) => {
    if (q && !norm(`${c.name} ${c.club.name}`).includes(norm(q))) return false;
    if (city && c.club.city !== city) return false;
    if (gender && !c.genders.includes(gender)) return false;
    return true;
  });
  const counts: Record<string, number> = {
    "": pool.length,
    OPEN: pool.filter((c) => c.status === "OPEN").length,
    ONGOING: pool.filter((c) => c.status === "ONGOING").length,
    FINISHED: pool.filter((c) => c.status === "FINISHED").length,
  };
  const shown = status ? pool.filter((c) => c.status === status) : pool;

  const featured = all.find((c) => c.status === "OPEN") ?? all.find((c) => c.status === "ONGOING") ?? all[0];
  const featuredSt = featured ? STATUS[featured.status] ?? STATUS.FINISHED : null;

  const pillHref = (key: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (city) p.set("city", city);
    if (gender) p.set("gender", gender);
    if (key) p.set("status", key);
    const s = p.toString();
    return `/public/tournaments${s ? `?${s}` : ""}`;
  };

  return (
    <>
      {/* Herói: título + pesquisa à esquerda, torneio em destaque à direita */}
      <section className="border-b border-line bg-gradient-to-b from-surface to-app">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-[2.6rem] font-black leading-[1.03] tracking-tight text-zinc-900 sm:text-[3.4rem]">
              {t("Descobre torneios em vários clubes de")}{" "}
              <span className="bg-gradient-to-r from-brand-purple to-brand-purple-2 bg-clip-text text-transparent">{t("Angola")}</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted sm:text-lg">{t("Encontra o torneio ideal para ti, em diferentes cidades e datas.")}</p>
            <div className="mt-7 max-w-2xl">
              <DiscoveryFilters q={q} city={city} gender={gender} status={status} cities={cities} />
            </div>
          </div>

          {featured && featuredSt && (
            <div className="relative hidden lg:block">
              <div className="pointer-events-none absolute -right-10 -top-12 size-72 rounded-full bg-brand-purple/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 left-2 size-60 rounded-full bg-brand-coral/15 blur-3xl" />

              <Link href={`/public/tournaments/${featured.id}`} className="group relative ml-auto block w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-2xl transition hover:-translate-y-1">
                <div className="relative h-44 overflow-hidden">
                  {featured.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.imageUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="relative size-full bg-gradient-to-br from-brand-navy via-brand-navy to-[#2a1d52]">
                      <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                      <div className="absolute -right-6 -top-8 size-32 rounded-full bg-brand-coral/30 blur-2xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />
                  <span className={`absolute left-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${featuredSt.cls}`}>{t(featuredSt.label)}</span>
                  {featured.club.logoUrl && (
                    <span className="absolute right-4 top-4 grid size-10 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={featured.club.logoUrl} alt="" className="size-full object-contain" />
                    </span>
                  )}
                  <p className="absolute inset-x-4 bottom-4 text-xl font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow">{featured.name}</p>
                </div>
                <div className="p-5">
                  <div className="space-y-1 text-sm text-muted">
                    <p className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0 text-soft" /> {featured.club.name}{featured.club.city ? ` · ${featured.club.city}` : ""}</p>
                    <p className="flex items-center gap-1.5"><CalendarClock className="size-4 shrink-0 text-soft" /> {fmtRange(featured.startDate, featured.endDate, t)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {featured.genders.slice(0, 3).map((g) => <span key={g} className="rounded-md bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">{t(GENDER_LABEL[g] ?? g)}</span>)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">{t("Ver")} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
                  </div>
                </div>
              </Link>

              <div className="absolute -left-5 bottom-10 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-xl">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple"><Users className="size-5" /></span>
                <div>
                  <p className="text-sm font-bold leading-none text-zinc-900">{featured.entryCount}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{t("duplas inscritas")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {STATUS_PILLS.map((p) => {
            const active = status === p.key;
            return (
              <Link key={p.key} href={pillHref(p.key)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${active ? "pz-gradient border-transparent text-white" : "border-line bg-surface text-muted hover:bg-surface-soft"}`}>
                {t(p.label)}
                <span className={`rounded-full px-1.5 text-xs font-bold ${active ? "bg-white/25 text-white" : "bg-surface-soft text-soft"}`}>{counts[p.key]}</span>
              </Link>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-14 text-center">
            <Trophy className="mx-auto size-8 text-soft" />
            <p className="mt-2 text-muted">{t("Não há torneios para mostrar com estes filtros.")}</p>
            <Link href="/public/tournaments" className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline">{t("Limpar filtros")}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => {
              const st = STATUS[c.status] ?? STATUS.FINISHED;
              return (
                <Link key={c.id} href={`/public/tournaments/${c.id}`} className="group pz-shadow-card flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-40 overflow-hidden">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="relative size-full bg-gradient-to-br from-brand-navy via-brand-navy to-[#2a1d52]">
                        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                        <div className="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full bg-brand-coral/25 blur-2xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/30" />
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{t(st.label)}</span>
                    {c.club.logoUrl && (
                      <span className="absolute right-3 top-3 grid size-9 place-items-center overflow-hidden rounded-lg bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.club.logoUrl} alt="" className="size-full object-contain" />
                      </span>
                    )}
                    <p className="absolute inset-x-3 bottom-3 text-lg font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow">{c.name}</p>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="space-y-1 text-sm text-muted">
                      <p className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0 text-soft" /> {c.club.name}{c.club.city ? ` · ${c.club.city}` : ""}</p>
                      <p className="flex items-center gap-1.5"><CalendarClock className="size-4 shrink-0 text-soft" /> {fmtRange(c.startDate, c.endDate, t)}</p>
                    </div>
                    {c.genders.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {c.genders.map((g) => <span key={g} className="rounded-md bg-surface-soft px-2 py-0.5 text-xs font-medium text-muted">{t(GENDER_LABEL[g] ?? g)}</span>)}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                      <span className="text-xs text-soft">{c.entryCount} {t("inscritos")}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">{t("Ver torneio")} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {sponsors.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-soft">{t("Patrocinadores")}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {sponsors.map((s) => {
                const img = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt={s.name} className="h-12 w-auto max-w-[150px] object-contain opacity-70 transition hover:opacity-100" />
                );
                return s.url ? (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name}>{img}</a>
                ) : (
                  <span key={s.id} title={s.name}>{img}</span>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
