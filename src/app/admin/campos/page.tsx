import { notFound } from "next/navigation";
import { MapPin, Trash2, Plus, LayoutGrid } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub, getClub } from "@/server/clubs";
import { addCourt, removeCourt } from "@/server/actions/clubs";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const primaryBtn = "pz-gradient inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";

export default async function AdminCamposPage() {
  const user = await getCurrentUser();
  const my = await getMyClub(user!.id);
  if (!my) notFound();
  const club = await getClub(my.slug);
  if (!club) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Campos"
        subtitle={`Os campos do ${club.name}, usados no calendário e no agendamento automático.`}
        help={[{ label: "Campos do clube", desc: "Os campos onde se jogam os torneios. São usados no calendário e no agendamento automático dos jogos." }]}
      />

      {/* Adicionar campo */}
      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-base font-bold text-zinc-900">Adicionar campo</h2>
        <form action={addCourt} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="clubId" value={club.id} />
          <input name="name" required placeholder="Ex.: Campo 1, Central, Court A…" className={field} />
          <button type="submit" className={`${primaryBtn} shrink-0`}>
            <Plus className="size-4" /> Adicionar
          </button>
        </form>
      </section>

      {/* Lista de campos */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900">Campos</h2>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-muted">{club.courts.length}</span>
      </div>

      {club.courts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <LayoutGrid className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há campos. Adiciona o primeiro acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {club.courts.map((court) => (
            <div key={court.id} className="pz-shadow-soft flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple">
                  <MapPin className="size-5" />
                </span>
                <span className="truncate font-semibold text-zinc-900">{court.name}</span>
              </span>
              <form action={removeCourt}>
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="courtId" value={court.id} />
                <button type="submit" aria-label={`Remover ${court.name}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
