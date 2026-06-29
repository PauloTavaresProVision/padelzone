"use client";

import { useActionState, useEffect, useState } from "react";
import { Search, Download, Pencil, X } from "lucide-react";
import { updatePlayer } from "@/server/actions/players";
import { Pagination, usePagination } from "./pagination";

export type Player = {
  id: number;
  name: string;
  email: string | null;
  accountEmail: string | null;
  phone: string | null;
  city: string | null;
  gender: string | null;
  shirtSize: string | null;
  entries: number;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const initials = (n: string) => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export function PlayersTable({ players, exportHref }: { players: Player[]; exportHref: string }) {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Player | null>(null);
  const filtered = players.filter((p) => !q || norm(`${p.name} ${p.email ?? ""} ${p.phone ?? ""} ${p.city ?? ""}`).includes(norm(q)));
  const pag = usePagination(filtered, 25, q);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar por nome, email, telefone…"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand-purple focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{filtered.length} jogadores</span>
          <a href={exportHref} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft">
            <Download className="size-4" /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft/60 text-left text-xs font-semibold uppercase tracking-wide text-soft">
                <th className="px-4 py-3">Jogador</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3 text-center">Inscrições</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-soft">Nenhum jogador encontrado.</td>
                </tr>
              ) : (
                pag.pageItems.map((p) => (
                  <tr key={p.id} className="transition hover:bg-surface-soft/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">{initials(p.name)}</span>
                        <span className="font-medium text-zinc-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{p.email ?? p.accountEmail ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{p.phone ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{p.city ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-muted">{p.entries}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEdit(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-soft">
                        <Pencil className="size-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={pag.page} pageCount={pag.pageCount} total={pag.total} from={pag.from} to={pag.to} onPage={pag.setPage} />

      {edit && <EditModal player={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [ok, action, pending] = useActionState<boolean, FormData>(async (_p, fd) => {
    await updatePlayer(fd);
    return true;
  }, false);
  useEffect(() => {
    if (ok) onClose();
  }, [ok]);

  const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-purple focus:outline-none";
  const label = "mb-1 block text-xs font-medium text-muted";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="pz-shadow-card w-full max-w-md rounded-2xl border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">Editar jogador</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-soft"><X className="size-5" /></button>
        </div>
        <form action={action} className="space-y-3">
          <input type="hidden" name="playerId" value={player.id} />
          <div>
            <label className={label}>Nome</label>
            <input name="name" defaultValue={player.name} required className={field} />
          </div>
          <div>
            <label className={label}>Email de contacto</label>
            <input name="email" type="email" defaultValue={player.email ?? ""} placeholder="nome@email.com" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Telefone</label>
              <input name="phone" defaultValue={player.phone ?? ""} placeholder="+244 …" className={field} />
            </div>
            <div>
              <label className={label}>Cidade</label>
              <input name="city" defaultValue={player.city ?? ""} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Género</label>
              <select name="gender" defaultValue={player.gender ?? ""} className={field}>
                <option value="">—</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </select>
            </div>
            <div>
              <label className={label}>T-shirt</label>
              <select name="shirtSize" defaultValue={player.shirtSize ?? ""} className={field}>
                <option value="">—</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="XXXL">XXXL</option>
              </select>
            </div>
          </div>
          {player.accountEmail && player.accountEmail !== player.email && (
            <p className="text-xs text-soft">Email da conta de login: {player.accountEmail}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">Cancelar</button>
            <button type="submit" disabled={pending} className="pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
