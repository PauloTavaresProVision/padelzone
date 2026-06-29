import { Mail, Check, RotateCcw, Trash2, Reply } from "lucide-react";
import { getContactMessages } from "@/server/master";
import { markContactHandled, deleteContactMessage } from "@/server/actions/master";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensagens · Master · PadelZone" };

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";

export default async function MasterMensagensPage() {
  const messages = await getContactMessages();
  const pending = messages.filter((m) => !m.handled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Mensagens de contacto</h1>
        <p className="mt-1 text-muted">Recebidas pelo formulário “Fala connosco” da página pública.{pending > 0 ? ` ${pending} por tratar.` : ""}</p>
      </div>

      {messages.length === 0 ? (
        <div className={`${card} p-12 text-center text-muted`}>Ainda não há mensagens.</div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`${card} ${m.handled ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-zinc-900">{m.name}</p>
                    <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-sm text-brand-purple hover:underline"><Mail className="size-3.5" /> {m.email}</a>
                    {m.handled ? (
                      <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">Tratada</span>
                    ) : (
                      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning">Nova</span>
                    )}
                  </div>
                  {m.subject && <p className="mt-1 text-sm font-semibold text-zinc-800">{m.subject}</p>}
                </div>
                <span className="shrink-0 text-xs text-soft">{dateFmt.format(m.createdAt)}</span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{m.message}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Contacto PadelZone"))}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft">
                  <Reply className="size-4" /> Responder
                </a>
                <form action={markContactHandled}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft">
                    {m.handled ? <><RotateCcw className="size-4" /> Marcar como nova</> : <><Check className="size-4 text-success" /> Marcar como tratada</>}
                  </button>
                </form>
                <form action={deleteContactMessage} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger">
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
