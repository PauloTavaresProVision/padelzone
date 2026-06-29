import { Megaphone, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { getAllSponsors } from "@/server/sponsors";
import { addSponsor, toggleSponsor, removeSponsor } from "@/server/actions/sponsors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patrocinadores · Master · PadelZone" };

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";

export default async function MasterPatrocinadoresPage() {
  const sponsors = await getAllSponsors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Patrocinadores</h1>
        <p className="mt-1 text-muted">Os logótipos aparecem na página inicial pública. Carrega a imagem e, se quiseres, o link do site.</p>
      </div>

      <form action={addSponsor} className={card}>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><Megaphone className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">Adicionar patrocinador</h2>
            <p className="mt-0.5 text-sm text-muted">PNG ou JPG, fundo transparente de preferência.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Nome</label>
            <input name="name" required placeholder="Ex.: Standard Bank" className={field} />
          </div>
          <div>
            <label className={label}>Link do site (opcional)</label>
            <input name="url" placeholder="https://…" className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Logótipo</label>
            <input type="file" name="logo" accept="image/*" required className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-purple" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95">Adicionar patrocinador</button>
        </div>
      </form>

      {sponsors.length === 0 ? (
        <div className={`${card} p-12 text-center text-muted`}>Ainda não há patrocinadores.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sponsors.map((s) => (
            <div key={s.id} className={`flex items-center gap-4 ${card}`}>
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logoUrl} alt={s.name} className="size-full object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-zinc-900">{s.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.active ? "bg-success-bg text-success" : "bg-surface-soft text-muted"}`}>{s.active ? "Ativo" : "Oculto"}</span>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-muted hover:text-brand-purple">
                    <ExternalLink className="size-3" /> {s.url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <form action={toggleSponsor}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" aria-label={s.active ? "Ocultar" : "Mostrar"} className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface-soft">
                    {s.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </form>
                <form action={removeSponsor}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" aria-label="Remover" className="grid size-9 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
