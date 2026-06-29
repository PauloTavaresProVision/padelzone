import { Building2, Clock, CheckCircle2, Ban, Trophy, Users, CalendarRange } from "lucide-react";
import { getMasterClubs, getMasterStats } from "@/server/master";
import { approveClub, updateClubAccess, suspendClub, reactivateClub } from "@/server/actions/master";
import { CLUB_STATUS_LABEL, clubAccess } from "@/lib/club-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Master · PadelZone" };

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
function fmt(d: Date | null) {
  return d ? dateFmt.format(d) : null;
}
function toInput(d: Date | null) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-warning-bg text-warning",
  ACTIVE: "bg-success-bg text-success",
  SUSPENDED: "bg-danger-bg text-danger",
};

const card = "pz-shadow-card rounded-2xl border border-line bg-surface";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1 block text-xs font-medium text-soft";
const primaryBtn = "pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default async function MasterPage() {
  const [stats, clubs] = await Promise.all([getMasterStats(), getMasterClubs()]);
  const today = toInput(new Date());

  const STAT = [
    { icon: Building2, label: "Clubes", value: stats.total, cls: "bg-primary-light text-brand-purple" },
    { icon: Clock, label: "Pendentes", value: stats.pending, cls: "bg-warning-bg text-warning" },
    { icon: CheckCircle2, label: "Ativos", value: stats.active, cls: "bg-success-bg text-success" },
    { icon: Ban, label: "Suspensos", value: stats.suspended, cls: "bg-danger-bg text-danger" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Backoffice da plataforma</h1>
        <p className="mt-1 text-muted">Aprova clubes, define o período de utilização e gere o acesso à plataforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT.map((s) => (
          <div key={s.label} className={`${card} p-4`}>
            <span className={`grid size-9 place-items-center rounded-xl ${s.cls}`}><s.icon className="size-[18px]" /></span>
            <p className="mt-2.5 text-2xl font-bold leading-none text-zinc-900">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {clubs.length === 0 ? (
          <div className={`${card} p-12 text-center text-muted`}>Ainda não há clubes na plataforma.</div>
        ) : (
          clubs.map((c) => {
            const access = clubAccess(c);
            return (
              <div key={c.id} className={`${card} p-5`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Identidade */}
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white text-xs font-bold text-soft">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt="" className="size-full object-contain" />
                      ) : initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-zinc-900">{c.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[c.status]}`}>{CLUB_STATUS_LABEL[c.status]}</span>
                        {c.status === "ACTIVE" && !access.live && <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger">{access.reason === "EXPIRED" ? "expirado" : "por iniciar"}</span>}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">{c.city ?? "Sem cidade"} · {c.owner ? c.owner.email : "sem dono"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soft">
                        <span className="inline-flex items-center gap-1"><Trophy className="size-3.5" /> {c.competitions} torneios</span>
                        <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c.players} jogadores</span>
                        <span className="inline-flex items-center gap-1"><CalendarRange className="size-3.5" /> {fmt(c.accessStart) ?? "início livre"} → {fmt(c.accessEnd) ?? "sem fim"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações por estado */}
                  <div className="shrink-0 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    {c.status === "PENDING" && (
                      <form action={approveClub} className="space-y-2.5">
                        <input type="hidden" name="clubId" value={c.id} />
                        <div className="flex gap-2">
                          <div><label className={label}>Início</label><input type="date" name="accessStart" defaultValue={today} className={field} /></div>
                          <div><label className={label}>Fim (opcional)</label><input type="date" name="accessEnd" className={field} /></div>
                        </div>
                        <button type="submit" className={`${primaryBtn} w-full`}>Aprovar clube</button>
                      </form>
                    )}

                    {c.status === "ACTIVE" && (
                      <div className="space-y-3">
                        <form action={updateClubAccess} className="space-y-2.5">
                          <input type="hidden" name="clubId" value={c.id} />
                          <div className="flex gap-2">
                            <div><label className={label}>Início</label><input type="date" name="accessStart" defaultValue={toInput(c.accessStart)} className={field} /></div>
                            <div><label className={label}>Fim</label><input type="date" name="accessEnd" defaultValue={toInput(c.accessEnd)} className={field} /></div>
                          </div>
                          <button type="submit" className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-soft">Guardar datas</button>
                        </form>
                        <form action={suspendClub}>
                          <input type="hidden" name="clubId" value={c.id} />
                          <button type="submit" className="w-full rounded-lg bg-danger-bg px-4 py-2 text-sm font-semibold text-danger transition hover:opacity-90">Suspender</button>
                        </form>
                      </div>
                    )}

                    {c.status === "SUSPENDED" && (
                      <form action={reactivateClub}>
                        <input type="hidden" name="clubId" value={c.id} />
                        <button type="submit" className={`${primaryBtn} w-full`}>Reativar clube</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
