import Link from "next/link";
import { Trophy, MapPin, CalendarClock, Swords, CheckCircle2, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyTournaments } from "@/server/player-area";

export const dynamic = "force-dynamic";
export const metadata = { title: "Torneios · PadelZone" };

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Em preparação", cls: "bg-surface-soft text-muted" },
  OPEN: { label: "Inscrições abertas", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-primary-light text-brand-purple" },
  FINISHED: { label: "Terminado", cls: "bg-surface-soft text-muted" },
  CANCELLED: { label: "Cancelado", cls: "bg-danger-bg text-danger" },
};
const ENTRY: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  CONFIRMED: { label: "Confirmada", cls: "bg-success-bg text-success" },
  WAITLIST: { label: "Lista de espera", cls: "bg-surface-soft text-muted" },
  WITHDRAWN: { label: "Retirada", cls: "bg-danger-bg text-danger" },
};

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
function fmtRange(a: Date | null, b: Date | null) {
  if (!a) return "Datas a anunciar";
  return b ? `${dateFmt.format(a)} – ${dateFmt.format(b)}` : dateFmt.format(a);
}

export default async function TorneiosPage() {
  const user = await getCurrentUser();
  const tournaments = await getMyTournaments(user!.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Os meus torneios</h1>
          <p className="mt-1 text-sm text-muted">Os torneios em que estás inscrito.</p>
        </div>
        <Link href="/inscrever" className="pz-gradient inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">
          <Search className="size-4" /> Inscrever
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Trophy className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não estás inscrito em nenhum torneio.</p>
          <Link href="/inscrever" className="pz-gradient mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white">
            <Search className="size-4" /> Explorar torneios
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tournaments.map((t) => {
            const st = STATUS[t.status] ?? STATUS.DRAFT;
            return (
              <div key={t.id} className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex min-w-0 items-center gap-2.5 font-bold text-zinc-900">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-brand-purple"><Trophy className="size-4" /></span>
                    <span className="truncate">{t.name}</span>
                  </h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4 text-soft" /> {fmtRange(t.startDate, t.endDate)}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-soft" /> {t.club.name}{t.club.city ? ` · ${t.club.city}` : ""}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.categories.map((c, i) => {
                    const es = ENTRY[c.entryStatus] ?? ENTRY.PENDING;
                    return (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-soft/60 px-2.5 py-1 text-xs">
                        <span className="font-bold text-brand-purple">{c.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${es.cls}`}>{es.label}</span>
                        {c.drawn && <CheckCircle2 className="size-3 text-success" />}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Swords className="size-4 text-soft" /> {t.games} {t.games === 1 ? "jogo" : "jogos"}</span>
                  {t.games > 0 ? (
                    <Link href="/jogos" className="text-sm font-semibold text-brand-purple hover:underline">Ver os meus jogos</Link>
                  ) : (
                    <span className="text-sm text-soft">Aguarda o sorteio</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
