"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, X, AlertTriangle } from "lucide-react";
import { lookupPhone } from "@/server/actions/entries";

type P = { id: number; name: string };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export function PartnerPicker({ players }: { players: P[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<{ id: number | null; name: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [taken, setTaken] = useState<{ id: number; name: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Verifica (debounced) se o telefone do novo parceiro já pertence a um jogador.
  useEffect(() => {
    if (!sel || sel.id !== null) { setTaken(null); return; }
    if (phone.replace(/\D/g, "").length < 6) { setTaken(null); return; }
    let active = true;
    const t = setTimeout(async () => {
      const hit = await lookupPhone(phone);
      if (active) { setTaken(hit); setConfirmed(false); }
    }, 450);
    return () => { active = false; clearTimeout(t); };
  }, [phone, sel]);

  const query = q.trim();
  const matches = query.length >= 2 ? players.filter((p) => norm(p.name).includes(norm(query))).slice(0, 6) : [];
  const canAddNew = query.length >= 2 && !players.some((p) => norm(p.name) === norm(query));

  if (sel) {
    return (
      <div className="space-y-2.5">
        <input type="hidden" name="partnerId" value={sel.id ?? ""} />
        <input type="hidden" name="partnerName" value={sel.id ? "" : sel.name} />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-soft/60 p-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">{initials(sel.name)}</span>
            <span className="min-w-0">
              <p className="truncate font-medium text-zinc-900">{sel.name}</p>
              <p className="text-xs text-muted">{sel.id ? "Jogador registado" : "Novo parceiro"}</p>
            </span>
          </span>
          <button type="button" onClick={() => { setSel(null); setQ(""); setPhone(""); setTaken(null); }} className="grid size-8 shrink-0 place-items-center rounded-lg text-soft transition hover:bg-surface hover:text-danger" aria-label="Mudar parceiro">
            <X className="size-4" />
          </button>
        </div>

        {!sel.id && (
          <div>
            <input
              name="partnerPhone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone do parceiro (ex.: 9XX XXX XXX)"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
            />
            {!taken && <p className="mt-1 text-xs text-soft">Enviamos-lhe uma mensagem a avisar da inscrição e a pedir que crie conta na plataforma.</p>}

            {taken && (
              <div className="mt-2 rounded-lg border border-warning/40 bg-warning-bg/50 p-3">
                <p className="flex items-start gap-1.5 text-sm font-medium text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Este número já tem um jogador registado: {taken.name}.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="button"
                    onClick={() => { setSel({ id: taken.id, name: taken.name }); setTaken(null); setPhone(""); }}
                    className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95"
                  >
                    Usar {taken.name}
                  </button>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                    <input type="checkbox" name="confirmPhone" value="1" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-4 accent-brand-purple" />
                    Continuar mesmo assim
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Procurar pelo nome…"
        className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
      />
      {query.length >= 2 && (matches.length > 0 || canAddNew) && (
        <div className="pz-shadow-card absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1">
          {matches.map((p) => (
            <button key={p.id} type="button" onClick={() => setSel({ id: p.id, name: p.name })} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-surface-soft">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-light text-[10px] font-bold text-brand-purple">{initials(p.name)}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          {canAddNew && (
            <button type="button" onClick={() => setSel({ id: null, name: query })} className="flex w-full items-center gap-2.5 border-t border-line px-3 py-2 text-left text-sm font-medium text-brand-purple transition hover:bg-surface-soft">
              <UserPlus className="size-4" /> Adicionar novo: “{query}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
