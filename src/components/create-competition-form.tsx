"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createCompetition } from "@/server/actions/competitions";
import { GENDER_LABEL } from "@/lib/categories";

type Template = { id: number; code: string; label: string; gender: string };

const fieldCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelCls = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

const GENDER_ORDER = ["MALE", "FEMALE", "MIXED"];

export function CreateCompetitionForm({
  clubId,
  templates,
}: {
  clubId: number;
  templates: Template[];
}) {
  const [state, action, pending] = useActionState(createCompetition, null);
  const [ranked, setRanked] = useState(false);

  const groups = GENDER_ORDER.map((gender) => ({
    gender,
    items: templates.filter((t) => t.gender === gender),
  })).filter((g) => g.items.length > 0);

  return (
    <form
      action={action}
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        <Plus className="size-5 text-brand-purple" />
        Nova competição
      </h2>

      <input type="hidden" name="clubId" value={clubId} />

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nome da competição</label>
          <input
            name="name"
            required
            placeholder="Ex.: Torneio de Verão"
            className={fieldCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Início</label>
            <input type="date" name="startDate" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Fim</label>
            <input type="date" name="endDate" className={fieldCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Foto do torneio (opcional)</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-purple/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-purple dark:text-zinc-300"
          />
        </div>

        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" name="applRanked" checked={ranked} onChange={(e) => setRanked(e.target.checked)} className="size-4 accent-brand-purple" />
            Conta para o ranking oficial APPL
          </label>
          {ranked && (
            <div className="mt-3">
              <label className={labelCls}>Tipo de prova</label>
              <select name="applType" defaultValue="OPEN_2000" className={fieldCls}>
                <option value="OPEN_2000">Open · Classe 2.000</option>
                <option value="OPEN_5000">Open · Classe 5.000</option>
                <option value="OPEN_10000">Open · Classe 10.000</option>
                <option value="CAMPEONATO">Campeonato (10.000)</option>
                <option value="MASTERS">Masters</option>
                <option value="LIGA">Liga de Clubes</option>
              </select>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Provas oficiais (Open, Campeonato, Masters, Liga) contam para o ranking. Sociais/amigáveis não.</p>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Categorias</label>
          {templates.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Este clube ainda não tem categorias no catálogo.
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.gender}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {GENDER_LABEL[group.gender]}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.items.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-brand-purple/50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          name="templateIds"
                          value={t.id}
                          className="size-4 accent-brand-purple"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-brand-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "A criar…" : "Criar competição"}
      </button>
    </form>
  );
}
