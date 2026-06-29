"use client";

import { useState, useActionState } from "react";
import { Trash2, Pencil, Plus, Users } from "lucide-react";
import { addCategoryFromTemplate, updateCategory, removeCategory, updateCategoryFormat } from "@/server/actions/competitions";
import { GENDER_LABEL } from "@/lib/categories";
import { formatKz } from "@/lib/money";

type Cat = {
  id: number;
  name: string;
  gender: string;
  price: number | null;
  maxEntries: number | null;
  latestStart: string | null;
  entries: number;
  format: string;
  numGroups: number;
  qualifiersPerGroup: number;
  useSeeds: boolean;
};
type Template = { id: number; code: string; label: string; gender: string };

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: "Eliminatórias",
  GROUPS_KNOCKOUT: "Grupos + Eliminatórias",
  GROUPS: "Liga / Grupos",
};

const field = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1 block text-xs font-medium text-muted";
const primaryBtn = "pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";
const badge = "rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-semibold text-muted";

const genderLabel = (g: string) => GENDER_LABEL[g] ?? g;

export function CategoriesManager({
  competitionId,
  categories,
  templates,
  canManage,
}: {
  competitionId: number;
  categories: Cat[];
  templates: Template[];
  canManage: boolean;
}) {
  const available = templates.filter((t) => !categories.some((c) => c.name === t.code));

  return (
    <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-900">Categorias</h2>
        <span className={badge}>{categories.length}</span>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Ainda não há categorias nesta competição.
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} canManage={canManage} />
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-5 border-t border-line pt-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Adicionar do catálogo</h3>
          {templates.length === 0 ? (
            <p className="text-sm text-muted">Define categorias no catálogo do clube primeiro.</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted">Todas as categorias do catálogo já foram adicionadas.</p>
          ) : (
            <form action={addCategoryFromTemplate} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="competitionId" value={competitionId} />
              <select name="clubCategoryId" className={`${field} min-w-[12rem] flex-1`}>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.code}</option>
                ))}
              </select>
              <button type="submit" className={primaryBtn}>
                <Plus className="mr-1 inline size-4" /> Adicionar categoria
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function CategoryRow({ cat, canManage }: { cat: Cat; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState(cat.format);
  const hasGroups = format === "GROUPS" || format === "GROUPS_KNOCKOUT";
  const [detState, detAction, detPending] = useActionState(updateCategory, null);
  const [fmtState, fmtAction, fmtPending] = useActionState(updateCategoryFormat, null);

  return (
    <li className="overflow-hidden rounded-xl border border-line">
      {/* Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-lg bg-primary-light px-2.5 py-1 text-sm font-bold text-brand-purple">{cat.name}</span>
          <span className={badge}>{genderLabel(cat.gender)}</span>
          <span className={badge}>{FORMAT_LABEL[cat.format] ?? cat.format}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Users className="size-4 text-soft" /> {cat.entries}
          </span>
          <span className="text-sm font-bold text-zinc-900">{formatKz(cat.price)}</span>
          {canManage && (
            <>
              <button
                onClick={() => setOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  open ? "border-brand-purple/40 bg-primary-light text-brand-purple" : "border-line text-muted hover:bg-surface-soft"
                }`}
              >
                <Pencil className="size-3.5" /> Editar
              </button>
              <form action={removeCategory}>
                <input type="hidden" name="categoryId" value={cat.id} />
                <button type="submit" aria-label="Remover categoria" className="inline-grid size-8 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      {canManage && open && (
        <div className="space-y-4 border-t border-line bg-surface-soft/40 p-4">
          <form action={detAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="categoryId" value={cat.id} />
            <div className="min-w-[10rem] flex-1">
              <label className={label}>Preço de inscrição</label>
              <div className="relative">
                <input type="number" name="price" step="0.01" min={0} defaultValue={cat.price ?? ""} placeholder="0,00" className={`${field} w-full pr-10`} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-soft">Kz</span>
              </div>
            </div>
            <div className="min-w-[8rem] flex-1">
              <label className={label}>Limite de inscrições</label>
              <input type="number" name="maxEntries" min={0} defaultValue={cat.maxEntries ?? ""} placeholder="Sem limite" className={`${field} w-full`} />
            </div>
            <div className="min-w-[9rem] flex-1">
              <label className={label}>Não jogar depois das</label>
              <input type="time" name="latestStart" defaultValue={cat.latestStart ?? ""} className={`${field} w-full`} />
            </div>
            <button type="submit" disabled={detPending} className={`${primaryBtn} disabled:opacity-60`}>{detPending ? "A guardar…" : "Guardar"}</button>
            {detState?.ok && <span className="self-center text-sm font-medium text-success">Guardado ✓</span>}
            {detState?.error && <span className="self-center text-sm font-medium text-danger">{detState.error}</span>}
          </form>

          <form action={fmtAction} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <input type="hidden" name="categoryId" value={cat.id} />
            <div className="min-w-[12rem] flex-1">
              <label className={label}>Formato</label>
              <select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className={`${field} w-full`}>
                <option value="KNOCKOUT">Eliminatórias</option>
                <option value="GROUPS_KNOCKOUT">Grupos + Eliminatórias</option>
                <option value="GROUPS">Só grupos / Liga</option>
              </select>
            </div>
            {hasGroups && (
              <>
                <div className="min-w-[7rem] flex-1">
                  <label className={label}>Nº de grupos</label>
                  <input type="number" name="numGroups" min={1} defaultValue={cat.numGroups} className={`${field} w-full`} />
                </div>
                <div className="min-w-[7rem] flex-1">
                  <label className={label}>Apurados por grupo</label>
                  <input type="number" name="qualifiersPerGroup" min={1} defaultValue={cat.qualifiersPerGroup} className={`${field} w-full`} />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 py-2 text-sm text-zinc-800">
              <input type="checkbox" name="useSeeds" defaultChecked={cat.useSeeds} className="size-4 rounded border-line text-brand-purple focus:ring-brand-purple" />
              Tem cabeças de série
            </label>
            <button type="submit" disabled={fmtPending} className={`${primaryBtn} disabled:opacity-60`}>{fmtPending ? "A guardar…" : "Guardar formato"}</button>
            {fmtState?.ok && <span className="self-center text-sm font-medium text-success">Guardado ✓</span>}
            {fmtState?.error && <span className="self-center text-sm font-medium text-danger">{fmtState.error}</span>}
          </form>
        </div>
      )}
    </li>
  );
}
