import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  MapPin,
  Pencil,
  Trophy,
  ClipboardList,
  Swords,
  Award,
  Percent,
  TrendingUp,
  Star,
  Search,
  CalendarClock,
  BarChart3,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPlayerDashboard } from "@/server/player-dashboard";
import { getMyGames } from "@/server/player-area";

export const dynamic = "force-dynamic";
export const metadata = { title: "Início · PadelZone" };

const dateFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short" });
const timeFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function fmtRange(a: Date | null, b: Date | null) {
  if (!a) return "Datas a anunciar";
  return b ? `${dateFmt.format(a)} – ${dateFmt.format(b)}` : dateFmt.format(a);
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

const ENTRY: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  CONFIRMED: { label: "Confirmada", cls: "bg-success-bg text-success" },
  WAITLIST: { label: "Lista de espera", cls: "bg-surface-soft text-muted" },
  WITHDRAWN: { label: "Retirada", cls: "bg-danger-bg text-danger" },
};

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";

export default async function InicioPage() {
  const user = await getCurrentUser();
  const d = await getPlayerDashboard(user!.id);
  const { upcoming, played } = await getMyGames(user!.id);
  const name = user?.name ?? "Jogador";
  const photo = d.player?.photoUrl ?? null;
  const location = d.player?.city ? `${d.player.city}, Angola` : "Angola";

  const statCards = [
    { icon: Trophy, label: "Torneios", value: String(d.stats.torneios) },
    { icon: ClipboardList, label: "Inscrições", value: String(d.stats.inscricoes) },
    { icon: Swords, label: "Jogos disputados", value: String(d.stats.jogos) },
    { icon: Award, label: "Vitórias", value: String(d.stats.vitorias) },
    { icon: Percent, label: "Taxa de vitória", value: d.stats.taxa == null ? "—" : `${d.stats.taxa}%` },
    { icon: TrendingUp, label: "Ranking points", value: String(d.rankingPoints) },
  ];

  const shortcuts = [
    { href: "/inscrever", icon: Search, label: "Inscrever" },
    { href: "/jogos", icon: Swords, label: "Os meus jogos" },
    { href: "/ranking", icon: BarChart3, label: "Ranking" },
    { href: "/pagamentos", icon: Wallet, label: "Pagamentos" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero de perfil */}
      <div className="pz-gradient pz-shadow-card relative overflow-hidden rounded-2xl p-6 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={name} className="size-20 shrink-0 rounded-full border-2 border-white/40 object-cover" />
            ) : (
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-white/20 text-2xl font-bold">{initials(name)}</span>
            )}
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 text-xl font-bold sm:text-2xl">
                <span className="truncate">{name}</span> <BadgeCheck className="size-5 shrink-0 text-white/90" />
              </h1>
              <p className="mt-0.5 text-sm font-medium text-white/85">Nível {d.level.level} · {d.level.name}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-white/70"><MapPin className="size-3.5 shrink-0" /> {location}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-xl bg-white/15 px-5 py-3 text-center">
              <p className="text-xs text-white/70">Ranking</p>
              <p className="text-2xl font-bold">{d.rank ? `#${d.rank}` : "#—"}</p>
              <p className="text-xs text-white/70">{d.rankingPoints} pts</p>
            </div>
            <div className="rounded-xl bg-white/15 px-5 py-3 sm:min-w-[230px]">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Nível {d.level.level} · {d.level.name}</span>
                <Star className="size-4" />
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${d.level.pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-white/75">{d.rankingPoints} / {d.level.next} pts para o Nível {d.level.level + 1}</p>
            </div>
          </div>
        </div>
        <Link href="/perfil" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25">
          <Pencil className="size-4" /> Editar perfil
        </Link>
      </div>

      {/* Estatísticas (reais) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-primary-light text-brand-purple"><Icon className="size-5" /></span>
            <p className="mt-3 text-xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Coluna principal: jogos + resultados */}
        <div className="space-y-5 lg:col-span-2">
          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Próximos jogos</h2>
              {upcoming.length > 0 && <Link href="/jogos" className="text-sm font-semibold text-brand-purple hover:underline">Ver todos</Link>}
            </div>
            {upcoming.length === 0 ? (
              <Empty>Sem jogos agendados. Aparecem aqui quando te inscreveres num torneio e o sorteio for feito.</Empty>
            ) : (
              <div className="space-y-2.5">
                {upcoming.slice(0, 4).map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-light text-brand-purple"><Swords className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">vs {g.opponent}</p>
                      <p className="truncate text-xs text-muted">{g.competition} · {g.category} · {g.section}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p>{g.when ? dateFmt.format(g.when) : "Por agendar"}</p>
                      {g.when && <p className="font-medium text-zinc-700">{timeFmt.format(g.when)}</p>}
                      {g.court && <p className="text-soft">{g.court}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Resultados recentes</h2>
              {played.length > 0 && <Link href="/jogos" className="text-sm font-semibold text-brand-purple hover:underline">Ver todos</Link>}
            </div>
            {played.length === 0 ? (
              <Empty>Sem resultados ainda. Os teus jogos disputados aparecem aqui.</Empty>
            ) : (
              <div className="space-y-2.5">
                {played.slice(0, 4).map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold ${g.won == null ? "bg-surface-soft text-muted" : g.won ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
                      {g.won == null ? "—" : g.won ? "V" : "D"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">vs {g.opponent}</p>
                      <p className="truncate text-xs text-muted">{g.competition} · {g.category}</p>
                    </div>
                    {g.sets && <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-900">{g.sets.map((s) => `${s.a}-${s.b}`).join("  ")}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna lateral: torneios + atalhos */}
        <div className="space-y-5">
          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Torneios inscritos</h2>
              {d.entries.length > 0 && <Link href="/torneios" className="text-sm font-semibold text-brand-purple hover:underline">Ver todos</Link>}
            </div>
            {d.entries.length === 0 ? (
              <Empty>
                Ainda não te inscreveste em torneios. <Link href="/inscrever" className="font-semibold text-brand-purple hover:underline">Inscrever agora</Link>
              </Empty>
            ) : (
              <div className="space-y-2">
                {d.entries.slice(0, 5).map((e) => {
                  const st = ENTRY[e.status] ?? ENTRY.PENDING;
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-light text-xs font-bold text-brand-purple">
                        {e.category.competition.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">{e.category.competition.name}</p>
                        <p className="truncate text-xs text-muted">{e.category.name} · {fmtRange(e.category.competition.startDate, e.category.competition.endDate)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-3 font-bold text-zinc-900">Atalhos</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {shortcuts.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="flex items-center gap-2.5 rounded-xl border border-line p-3 transition hover:bg-surface-soft">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-brand-purple"><Icon className="size-4" /></span>
                  <span className="truncate text-sm font-semibold text-zinc-900">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
