"use client";

import { useActionState, useState } from "react";
import { registerSelf } from "@/server/actions/entries";
import { formatKz } from "@/lib/money";
import { PartnerPicker } from "./partner-picker";
import { AvailabilityPicker } from "./availability-picker";

type Category = { id: number; name: string; gender: string; unit: string; price: number | null; maxEntries: number | null; inscritos: number };
type Competition = { id: number; name: string; club: string; startDate: string | null; endDate: string | null; categories: Category[] };
type P = { id: number; name: string };

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-muted";
const GENDER: Record<string, string> = { MALE: "Masculino", FEMALE: "Feminino", MIXED: "Misto" };

function dayRange(start: string | null, end: string | null): string[] {
  if (!start) return [];
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = end ? new Date(end + "T00:00:00Z").getTime() : s;
  const out: string[] = [];
  for (let d = s; d <= e && out.length < 21; d += 86400000) out.push(new Date(d).toISOString().slice(0, 10));
  return out;
}

export function RegisterSelfForm({ competitions, players }: { competitions: Competition[]; players: P[] }) {
  const [state, action, pending] = useActionState(registerSelf, null);
  const [compId, setCompId] = useState<number | null>(null);
  const [catId, setCatId] = useState<number | null>(null);

  const selectedComp = competitions.find((c) => c.id === compId) ?? null;
  const selectedCat = selectedComp?.categories.find((k) => k.id === catId) ?? null;
  const full = selectedCat?.maxEntries != null && selectedCat.inscritos >= selectedCat.maxEntries;
  const priced = selectedCat != null && selectedCat.price != null && selectedCat.price > 0;
  const days = selectedComp ? dayRange(selectedComp.startDate, selectedComp.endDate) : [];

  return (
    <form action={action} className="pz-shadow-card space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div>
        <label className={labelCls}>Torneio</label>
        <select value={compId ?? ""} onChange={(e) => { setCompId(e.target.value ? Number(e.target.value) : null); setCatId(null); }} className={field}>
          <option value="">Seleciona um torneio…</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {c.club}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Categoria</label>
        <select value={catId ?? ""} onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : null)} disabled={!selectedComp} className={`${field} disabled:opacity-60`}>
          <option value="">Seleciona uma categoria…</option>
          {selectedComp?.categories.map((k) => (
            <option key={k.id} value={k.id}>{k.name} · {GENDER[k.gender] ?? k.gender}{k.unit === "PAIR" ? " · Duplas" : " · Individual"}</option>
          ))}
        </select>
      </div>

      <input type="hidden" name="categoryId" value={catId ?? ""} />
      <input type="hidden" name="type" value={selectedCat?.unit ?? "PAIR"} />

      {selectedCat?.unit === "PAIR" && (
        <div>
          <label className={labelCls}>A tua dupla (parceiro)</label>
          <PartnerPicker players={players} />
          <p className="mt-1.5 text-xs text-soft">Procura um jogador já registado ou adiciona um novo pelo nome.</p>
        </div>
      )}

      {selectedComp && days.length > 0 && (
        <div>
          <label className={labelCls}>Disponibilidade</label>
          <AvailabilityPicker days={days} />
        </div>
      )}

      {selectedCat && full && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">Esta categoria está cheia — ficas em lista de espera.</p>
      )}

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input type="checkbox" required className="mt-0.5 size-4 accent-brand-purple" />
        <span>
          Aceito o{" "}
          {selectedComp ? (
            <a href={`/public/tournaments/${selectedComp.id}?tab=info`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-purple hover:underline">regulamento do torneio</a>
          ) : (
            "regulamento do torneio"
          )}.
        </span>
      </label>

      <div className="flex items-center justify-between rounded-xl bg-surface-soft/60 px-4 py-3">
        <span className="text-sm font-medium text-muted">Valor da inscrição</span>
        <span className="text-base font-bold text-zinc-900">{selectedCat ? formatKz(selectedCat.price, { zero: "Grátis", empty: "Grátis" }) : "—"}</span>
      </div>

      {state?.error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={!catId || pending} className="pz-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
        {pending ? "A inscrever…" : "Confirmar inscrição"}
      </button>
      {priced && <p className="text-center text-xs text-soft">Depois de te inscreveres, pagas em Pagamentos (Multicaixa).</p>}
    </form>
  );
}
