"use client";

import { useState } from "react";

// Campos APPL partilhados pela criação e edição do torneio: conta para o ranking + tipo de prova.
export function ApplRankingFields({ defaultRanked = false, defaultType = null }: { defaultRanked?: boolean; defaultType?: string | null }) {
  const [ranked, setRanked] = useState(defaultRanked);
  return (
    <div className="rounded-lg border border-line p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          name="applRanked"
          checked={ranked}
          onChange={(e) => setRanked(e.target.checked)}
          className="size-4 accent-brand-purple"
        />
        Conta para o ranking oficial APPL
      </label>
      {ranked && (
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Tipo de prova</label>
          <select
            name="applType"
            defaultValue={defaultType ?? "OPEN_2000"}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
          >
            <option value="OPEN_2000">Open · Classe 2.000</option>
            <option value="OPEN_5000">Open · Classe 5.000</option>
            <option value="OPEN_10000">Open · Classe 10.000</option>
            <option value="CAMPEONATO">Campeonato (10.000)</option>
            <option value="MASTERS">Masters</option>
            <option value="LIGA">Liga de Clubes</option>
          </select>
          <p className="mt-1.5 text-xs text-muted">Provas oficiais (Open, Campeonato, Masters, Liga) contam para o ranking. Sociais/amigáveis não.</p>
        </div>
      )}
    </div>
  );
}
