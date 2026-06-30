import { notFound } from "next/navigation";
import { Trash2, Award, Activity, FileText, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { updateCompetition, setCompetitionStatus, deleteCompetition } from "@/server/actions/competitions";
import { finalizeCompetition } from "@/server/actions/ranking";
import { TournamentHeader } from "@/components/tournament-header";
import { ApplRankingFields } from "@/components/appl-ranking-fields";

export const dynamic = "force-dynamic";

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";
const primaryBtn = "pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";

const STATUS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "Oculto (rascunho)" },
  { value: "OPEN", label: "Em inscrição" },
  { value: "ONGOING", label: "Em curso" },
  { value: "FINISHED", label: "Terminado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const HELP = [
  { label: "Estado", desc: "Controla a fase e a visibilidade do torneio: Oculto (rascunho), Em inscrição, Em curso, Terminado ou Cancelado." },
  { label: "Dados do torneio", desc: "Nome, descrição, datas e o período de inscrições (abertura e fecho). A foto aparece no cartaz do torneio." },
  { label: "Concluir", desc: "Marca o torneio como terminado e atribui automaticamente os pontos de ranking aos jogadores, com base nos resultados." },
  { label: "Zona de perigo", desc: "Eliminar o torneio é permanente: apaga inscrições, sorteios e resultados. Não pode ser revertido." },
];

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
const dt = (x: Date | null) => (x ? x.toISOString().slice(0, 16) : "");

function SectionHead({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <h2 className="text-base font-bold leading-tight text-zinc-900">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default async function DefinicoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();
  const finished = comp.status === "FINISHED";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <TournamentHeader compId={comp.id} title="Definições" subtitle="Estado, dados, conclusão e eliminação do torneio." help={HELP} />

      {/* Estado */}
      <section className={card}>
        <SectionHead icon={Activity} title="Estado do torneio" desc="Define a fase e quem o pode ver." />
        <form action={setCompetitionStatus} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="id" value={comp.id} />
          <div className="flex-1">
            <label className={label}>Estado</label>
            <select name="status" defaultValue={comp.status} className={field}>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${primaryBtn} shrink-0`}>Atualizar estado</button>
        </form>
      </section>

      {/* Dados */}
      <section className={card}>
        <SectionHead icon={FileText} title="Dados do torneio" desc="Nome, descrição, datas, inscrições e cartaz." />
        <form action={updateCompetition} className="space-y-4">
          <input type="hidden" name="id" value={comp.id} />
          <div>
            <label className={label}>Nome</label>
            <input name="name" defaultValue={comp.name} required className={field} />
          </div>
          <div>
            <label className={label}>Descrição</label>
            <textarea name="description" defaultValue={comp.description ?? ""} rows={3} className={field} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Data de início</label>
              <input type="date" name="startDate" defaultValue={d(comp.startDate)} className={field} />
            </div>
            <div>
              <label className={label}>Data de fim</label>
              <input type="date" name="endDate" defaultValue={d(comp.endDate)} className={field} />
            </div>
            <div>
              <label className={label}>Abertura das inscrições</label>
              <input type="datetime-local" name="regOpenAt" defaultValue={dt(comp.regOpenAt)} className={field} />
            </div>
            <div>
              <label className={label}>Fecho das inscrições</label>
              <input type="datetime-local" name="regCloseAt" defaultValue={dt(comp.regCloseAt)} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Foto do torneio</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-purple"
            />
          </div>
          <ApplRankingFields defaultRanked={comp.applRanked} defaultType={comp.applType} />
          <button type="submit" className={primaryBtn}>Guardar alterações</button>
        </form>
      </section>

      {/* Concluir */}
      <section className="rounded-2xl border border-brand-purple/20 bg-primary-light/50 p-5">
        <SectionHead icon={Award} title="Concluir torneio" desc="Termina o torneio e atribui os pontos de ranking aos jogadores, pelos resultados." />
        <form action={finalizeCompetition}>
          <input type="hidden" name="id" value={comp.id} />
          <button type="submit" disabled={finished} className={`${primaryBtn} inline-flex items-center gap-1.5 disabled:opacity-60`}>
            <Award className="size-4" />
            {finished ? "Pontos já atribuídos" : "Finalizar e atribuir pontos"}
          </button>
        </form>
      </section>

      {/* Zona de perigo */}
      <section className="rounded-2xl border border-danger/40 bg-danger-bg/40 p-5">
        <SectionHead icon={AlertTriangle} title="Zona de perigo" desc="Eliminar é permanente e apaga inscrições, sorteios e resultados. Não há volta." />
        <form action={deleteCompetition}>
          <input type="hidden" name="id" value={comp.id} />
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-danger/50 bg-surface px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-bg">
            <Trash2 className="size-4" /> Eliminar torneio
          </button>
        </form>
      </section>
    </div>
  );
}
