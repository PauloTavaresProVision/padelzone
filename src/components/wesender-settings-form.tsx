"use client";

import { useActionState } from "react";
import { MessageCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { saveWesender, sendTestMessage, type SmtpState } from "@/server/actions/platform";

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";

function Notice({ state }: { state: SmtpState }) {
  if (!state) return null;
  if (state.ok) return <p className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" /> {state.ok}</p>;
  if (state.error) return <p className="flex items-center gap-1.5 text-sm font-medium text-danger"><AlertCircle className="size-4" /> {state.error}</p>;
  return null;
}

export function WesenderSettingsForm({ hasKey }: { hasKey: boolean }) {
  const [saveState, saveAction, saving] = useActionState<SmtpState, FormData>(saveWesender, null);
  const [testState, testAction, testing] = useActionState<SmtpState, FormData>(sendTestMessage, null);

  return (
    <div className="space-y-5">
      <form action={saveAction} className={card}>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><MessageCircle className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">WhatsApp / SMS (WeSender)</h2>
            <p className="mt-0.5 text-sm text-muted">Envia avisos por WhatsApp/SMS, como o convite a parceiros não registados.</p>
          </div>
        </div>

        <div>
          <label className={label}>Chave da API (ApiKey) {hasKey && <span className="text-xs text-soft">(guardada — deixa em branco para manter)</span>}</label>
          <input name="wesenderApiKey" type="password" placeholder={hasKey ? "••••••••" : "a tua ApiKey do WeSender"} className={field} />
          <p className="mt-1.5 text-xs text-soft">Obténs a chave na tua conta em wesender.co.ao.</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Notice state={saveState} />
          <button type="submit" disabled={saving} className="pz-gradient ml-auto shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
            {saving ? "A guardar…" : "Guardar chave"}
          </button>
        </div>
      </form>

      <form action={testAction} className={card}>
        <div className="mb-3 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><Send className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">Testar envio</h2>
            <p className="mt-0.5 text-sm text-muted">Guarda a chave e envia uma mensagem de teste para um número.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input name="to" type="tel" placeholder="Telefone (ex.: 9XX XXX XXX)" className={`${field} flex-1`} />
          <button type="submit" disabled={testing} className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft disabled:opacity-60">
            {testing ? "A enviar…" : "Enviar mensagem de teste"}
          </button>
        </div>
        <div className="mt-3"><Notice state={testState} /></div>
      </form>
    </div>
  );
}
