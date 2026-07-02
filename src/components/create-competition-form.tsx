"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { createCompetition } from "@/server/actions/competitions";
import { ApplRankingFields } from "@/components/appl-ranking-fields";
import { GENDER_LABEL } from "@/lib/categories";

type Template = { id: number; code: string; label: string; gender: string };

const fieldCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelCls = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const btnGhost = "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300";
const btnPrimary = "rounded-lg bg-brand-purple px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60";

const GENDER_ORDER = ["MALE", "FEMALE", "MIXED"];
const STEPS = ["Dados", "Categorias e formato", "Ranking e foto"];

export function CreateCompetitionForm({ clubId, templates }: { clubId: number; templates: Template[] }) {
  const [state, action, pending] = useActionState(createCompetition, null);
  const [step, setStep] = useState(0);
  const [format, setFormat] = useState("GROUPS_KNOCKOUT");
  const formRef = useRef<HTMLFormElement>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const groups = GENDER_ORDER.map((gender) => ({ gender, items: templates.filter((t) => t.gender === gender) })).filter((g) => g.items.length > 0);
  const show = (i: number) => (step === i ? "" : "hidden");

  // Validação no cliente antes de avançar/criar (o servidor valida à mesma).
  function stepProblem(i: number): string | null {
    const f = formRef.current;
    if (!f) return null;
    const fd = new FormData(f);
    if (i === 0) {
      if (!String(fd.get("name") ?? "").trim()) return "Indica o nome do torneio.";
      const start = String(fd.get("startDate") ?? ""), end = String(fd.get("endDate") ?? "");
      if (start && end && end < start) return "A data de fim não pode ser anterior ao início.";
      const ro = String(fd.get("regOpenAt") ?? ""), rc = String(fd.get("regCloseAt") ?? "");
      if (ro && rc && rc < ro) return "O fecho das inscrições não pode ser anterior à abertura.";
    }
    return null;
  }
  function goNext() {
    const problem = stepProblem(step);
    if (problem) return setStepError(problem);
    setStepError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        const problem = stepProblem(0);
        if (problem) {
          e.preventDefault();
          setStepError(problem);
          setStep(0);
        }
      }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        <Plus className="size-5 text-brand-purple" /> Novo torneio
      </h2>

      {/* Passos */}
      <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${i < step ? "bg-success text-white" : i === step ? "bg-brand-purple text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700"}`}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={`text-sm font-medium ${i === step ? "text-brand-purple" : "text-zinc-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-zinc-300 dark:bg-zinc-700" />}
          </div>
        ))}
      </div>

      <input type="hidden" name="clubId" value={clubId} />

      {/* Passo 1 — Dados */}
      <div className={`space-y-4 ${show(0)}`}>
        <div>
          <label className={labelCls}>Nome do torneio</label>
          <input name="name" placeholder="Ex.: Torneio de Verão" className={fieldCls} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Início</label><input type="date" name="startDate" className={fieldCls} /></div>
          <div><label className={labelCls}>Fim</label><input type="date" name="endDate" className={fieldCls} /></div>
          <div><label className={labelCls}>Abertura das inscrições</label><input type="datetime-local" name="regOpenAt" className={fieldCls} /></div>
          <div><label className={labelCls}>Fecho das inscrições</label><input type="datetime-local" name="regCloseAt" className={fieldCls} /></div>
          <div><label className={labelCls}>Prazo para pagar a reserva (horas)</label><input type="number" name="paymentHoldHours" min={1} placeholder="Sem prazo" className={fieldCls} /></div>
        </div>
      </div>

      {/* Passo 2 — Categorias e formato */}
      <div className={`space-y-4 ${show(1)}`}>
        <div>
          <label className={labelCls}>Categorias</label>
          {templates.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Este clube ainda não tem categorias no catálogo.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.gender}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{GENDER_LABEL[group.gender]}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.items.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-brand-purple/50 dark:border-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" name="templateIds" value={t.id} className="size-4 accent-brand-purple" />
                        {t.code}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Máximo de duplas por categoria</label>
          <input type="number" name="maxEntries" min={2} placeholder="Sem limite" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Formato</label>
          <select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className={fieldCls}>
            <option value="GROUPS_KNOCKOUT">Grupos + Eliminatórias</option>
            <option value="KNOCKOUT">Só eliminatórias</option>
            <option value="GROUPS">Só grupos (liga)</option>
          </select>
        </div>
        {format !== "KNOCKOUT" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Nº de grupos</label><input type="number" name="numGroups" min={1} defaultValue={2} className={fieldCls} /><p className="mt-1 text-xs text-soft">Em quantos grupos dividir as duplas (todos contra todos dentro do grupo).</p></div>
            {format === "GROUPS_KNOCKOUT" && (
              <div><label className={labelCls}>Apuram por grupo</label><input type="number" name="qualifiersPerGroup" min={1} defaultValue={2} className={fieldCls} /><p className="mt-1 text-xs text-soft">Quantas duplas de cada grupo passam ao quadro final.</p></div>
            )}
          </div>
        )}
      </div>

      {/* Passo 3 — Ranking e foto */}
      <div className={`space-y-4 ${show(2)}`}>
        <ApplRankingFields />
        <div>
          <label className={labelCls}>Foto do torneio (opcional)</label>
          <input type="file" name="image" accept="image/*" className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-purple/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-purple dark:text-zinc-300" />
        </div>
      </div>

      {(stepError || state?.error) && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{stepError ?? state?.error}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" onClick={goBack} disabled={step === 0} className={btnGhost}>Voltar</button>
        {step < STEPS.length - 1 ? (
          <button key="next" type="button" onClick={goNext} className={btnPrimary}>Seguinte</button>
        ) : (
          <button key="create" type="submit" disabled={pending} className={btnPrimary}>{pending ? "A criar…" : "Criar torneio"}</button>
        )}
      </div>
    </form>
  );
}
