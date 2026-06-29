"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Send, CheckCircle2, Users, Search, X } from "lucide-react";
import { sendMessage, type MessageState } from "@/server/actions/messages";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";

type Audience = { id: number; name: string; count: number };
type Player = { id: number; name: string };

// Campo de pesquisa de jogador (escreve o nome -> aparecem os correspondentes). Filtra no cliente.
function PlayerSearch({ players, value, onChange }: { players: Player[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = value ? players.find((p) => String(p.id) === value) : null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, players]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-soft px-3 py-2">
        <span className="text-sm font-medium text-zinc-900">{selected.name}</span>
        <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="grid size-7 shrink-0 place-items-center rounded-md text-soft transition hover:bg-surface hover:text-danger" aria-label="Mudar jogador">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Escreve o nome do jogador…"
        className={`${field} pl-9`}
        autoComplete="off"
      />
      {open && query.trim() && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface py-1 pz-shadow-card">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sem jogadores com esse nome.</li>
          ) : (
            matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(String(p.id)); setOpen(false); }}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-surface-soft"
                >
                  {p.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function MessageComposer({ audiences, players, allCount }: { audiences: Audience[]; players: Player[]; allCount: number }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [target, setTarget] = useState("all");
  const [playerId, setPlayerId] = useState("");

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setTarget("all");
      setPlayerId("");
    }
  }, [state]);

  const count =
    target === "all"
      ? allCount
      : target === "player"
        ? (playerId ? 1 : 0)
        : (audiences.find((a) => String(a.id) === target)?.count ?? 0);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label className={label} htmlFor="competitionId">Para</label>
        <select id="competitionId" name="competitionId" value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
          <option value="all">Todos os jogadores do clube ({allCount})</option>
          <option value="player">Um jogador específico…</option>
          {audiences.map((a) => (
            <option key={a.id} value={a.id}>Torneio: {a.name} ({a.count})</option>
          ))}
        </select>
      </div>

      {target === "player" && (
        <div>
          <label className={label}>Jogador</label>
          <PlayerSearch players={players} value={playerId} onChange={setPlayerId} />
          <input type="hidden" name="playerId" value={playerId} />
        </div>
      )}

      <div>
        <label className={label} htmlFor="subject">Assunto</label>
        <input id="subject" name="subject" maxLength={120} placeholder="Ex.: Alteração de horários no sábado" className={field} />
      </div>

      <div>
        <label className={label} htmlFor="body">Mensagem</label>
        <textarea id="body" name="body" rows={5} placeholder="Escreve a mensagem para os jogadores…" className={field} />
      </div>

      {state?.error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <p className="flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> Mensagem enviada. Aparece no menu Mensagens dos jogadores.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Users className="size-4 text-soft" />
          {count === 1 ? "Vai para 1 jogador" : `Vai para ${count} jogadores`}
        </span>
        <button type="submit" disabled={pending || count === 0} className="pz-gradient inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
          <Send className="size-4" /> {pending ? "A enviar…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}
