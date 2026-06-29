import { notFound } from "next/navigation";
import { Trash2, Tags } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getClubCategories } from "@/server/club-categories";
import { addClubCategory, updateClubCategory, removeClubCategory } from "@/server/actions/club-categories";
import { GENDER_LABEL } from "@/lib/categories";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-muted";
const primaryBtn = "pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 shrink-0";
const codeTag = "rounded-lg bg-primary-light px-2.5 py-1 text-sm font-bold text-brand-purple";

const GENDER_ORDER = ["MALE", "FEMALE", "MIXED"] as const;

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const cats = await getClubCategories(club.id);
  const groups = GENDER_ORDER.map((gender) => ({ gender, items: cats.filter((c) => c.gender === gender) })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Categorias"
        subtitle={`Catálogo do ${club.name}, usado ao criar torneios.`}
        help={[{ label: "Catálogo de categorias", desc: "As categorias do clube (M1 a M5, F1 a F5, Mx1 a Mx5). São estas que escolhes ao criar um torneio." }]}
      />

      {cats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Tags className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Este clube ainda não tem categorias. Adiciona a primeira abaixo.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.gender} className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">{GENDER_LABEL[group.gender]}</h2>
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-muted">{group.items.length}</span>
            </div>

            <ul className="space-y-2">
              {group.items.map((cat) => (
                <li key={cat.id} className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row sm:items-end">
                  <form action={updateClubCategory} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="id" value={cat.id} />
                    <span className={`${codeTag} self-start sm:mb-1`} title="Código">{cat.code}</span>
                    <div className="flex-1">
                      <label className={labelCls}>Nome</label>
                      <input name="label" defaultValue={cat.label} required className={field} />
                    </div>
                    <div className="sm:w-44">
                      <label className={labelCls}>Género</label>
                      <select name="gender" defaultValue={cat.gender} className={field}>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Feminino</option>
                        <option value="MIXED">Misto</option>
                      </select>
                    </div>
                    <button type="submit" className={primaryBtn}>Guardar</button>
                  </form>
                  <form action={removeClubCategory} className="shrink-0">
                    <input type="hidden" name="id" value={cat.id} />
                    <button type="submit" aria-label={`Remover ${cat.label}`} className="inline-grid size-9 place-items-center rounded-lg border border-line text-soft transition hover:bg-danger-bg hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Adicionar categoria */}
      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-bold text-zinc-900">Adicionar categoria</h2>
        <form action={addClubCategory} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="clubId" value={club.id} />
          <div className="sm:w-32">
            <label className={labelCls}>Código</label>
            <input name="code" required placeholder="Ex.: M1" className={field} />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Nome</label>
            <input name="label" required placeholder="Ex.: Masculino 1" className={field} />
          </div>
          <div className="sm:w-44">
            <label className={labelCls}>Género</label>
            <select name="gender" defaultValue="MALE" className={field}>
              <option value="MALE">Masculino</option>
              <option value="FEMALE">Feminino</option>
              <option value="MIXED">Misto</option>
            </select>
          </div>
          <button type="submit" className={primaryBtn}>Adicionar</button>
        </form>
      </section>
    </div>
  );
}
