import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Calendar, Tag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getClubCompetitions } from "@/server/competitions";
import { getClubCategories } from "@/server/club-categories";
import { CreateTournamentModal } from "@/components/create-tournament-modal";
import { HelpButton } from "@/components/help-button";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Oculto", cls: "bg-surface-soft text-muted" },
  OPEN: { label: "Em inscrição", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-primary-light text-brand-purple" },
  FINISHED: { label: "Terminado", cls: "bg-surface-soft text-muted" },
  CANCELLED: { label: "Cancelado", cls: "bg-danger-bg text-danger" },
};
const ACTIVE = ["DRAFT", "OPEN", "ONGOING"];

function fmtDate(d: Date | null) {
  return d ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(d) : null;
}
function dateRange(s: Date | null, e: Date | null) {
  const a = fmtDate(s), b = fmtDate(e);
  if (a && b) return `${a} – ${b}`;
  return a || b || "Datas a anunciar";
}

export default async function AdminTorneiosPage() {
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const comps = await getClubCompetitions(club.id);
  const templates = await getClubCategories(club.id);
  const ativos = comps.filter((c) => ACTIVE.includes(c.status));
  const concluidos = comps.filter((c) => !ACTIVE.includes(c.status));

  const section = (title: string, items: typeof comps) =>
    items.length === 0 ? null : (
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-muted">{items.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((c) => {
            const st = STATUS[c.status] ?? STATUS.DRAFT;
            return (
              <Link
                key={c.id}
                href={`/admin/torneios/${c.id}`}
                className="pz-shadow-soft block rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-purple/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-2.5 font-bold text-zinc-900">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-brand-purple">
                      <Trophy className="size-4" />
                    </span>
                    <span className="truncate">{c.name}</span>
                  </h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4 text-soft" /> {dateRange(c.startDate, c.endDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="size-4 text-soft" /> {c._count.categories} {c._count.categories === 1 ? "categoria" : "categorias"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-zinc-900">Torneios</h1>
            <p className="mt-1 text-sm text-muted">{club.name}</p>
          </div>
          <HelpButton title="Ajuda: Torneios" items={[{ label: "Os teus torneios", desc: "Cria e gere os torneios do clube. Cada torneio tem o seu próprio painel: inscrições, sorteio, calendário e resultados." }]} />
        </div>
        <CreateTournamentModal clubId={club.id} templates={templates} />
      </div>

      {comps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Trophy className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há torneios. Cria o primeiro com o botão acima.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {section("Ativos", ativos)}
          {section("Concluídos", concluidos)}
        </div>
      )}
    </div>
  );
}
