"use client";

import { useActionState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { saveSmtp, sendTestEmail, type SmtpState } from "@/server/actions/platform";

type Settings = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromName: string | null;
  smtpFromEmail: string | null;
  hasPassword: boolean;
};

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";

function Notice({ state }: { state: SmtpState }) {
  if (!state) return null;
  if (state.ok) return <p className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" /> {state.ok}</p>;
  if (state.error) return <p className="flex items-center gap-1.5 text-sm font-medium text-danger"><AlertCircle className="size-4" /> {state.error}</p>;
  return null;
}

export function SmtpSettingsForm({ settings, testTo }: { settings: Settings; testTo: string }) {
  const [saveState, saveAction, saving] = useActionState<SmtpState, FormData>(saveSmtp, null);
  const [testState, testAction, testing] = useActionState<SmtpState, FormData>(sendTestEmail, null);

  return (
    <div className="space-y-5">
      <form action={saveAction} className={card}>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><Mail className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">Servidor de email (SMTP)</h2>
            <p className="mt-0.5 text-sm text-muted">Usado para recuperação de password e notificações.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Servidor (host)</label>
            <input name="smtpHost" defaultValue={settings.smtpHost ?? ""} placeholder="smtp.gmail.com" className={field} />
          </div>
          <div>
            <label className={label}>Porta</label>
            <input name="smtpPort" type="number" defaultValue={settings.smtpPort ?? ""} placeholder="587" className={field} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="smtpSecure" defaultChecked={settings.smtpSecure} className="size-4 rounded border-line accent-brand-purple" />
              Ligação segura (SSL/TLS — porta 465)
            </label>
          </div>
          <p className="sm:col-span-2 -mt-1 rounded-lg bg-surface-soft px-3 py-2 text-xs text-soft">
            Porta <strong>587</strong> usa STARTTLS (deixa &quot;Ligação segura&quot; desligada); porta <strong>465</strong> usa SSL/TLS (liga). O sistema ajusta-se à porta automaticamente.
          </p>
          <div>
            <label className={label}>Utilizador</label>
            <input name="smtpUser" defaultValue={settings.smtpUser ?? ""} placeholder="o-teu-email@gmail.com" className={field} />
          </div>
          <div>
            <label className={label}>Password {settings.hasPassword && <span className="text-xs text-soft">(guardada — deixa em branco para manter)</span>}</label>
            <input name="smtpPassword" type="password" placeholder={settings.hasPassword ? "••••••••" : "password da app"} className={field} />
          </div>
          <div>
            <label className={label}>Nome do remetente</label>
            <input name="smtpFromName" defaultValue={settings.smtpFromName ?? ""} placeholder="PadelZone" className={field} />
          </div>
          <div>
            <label className={label}>Email do remetente</label>
            <input name="smtpFromEmail" type="email" defaultValue={settings.smtpFromEmail ?? ""} placeholder="nao-responder@padelzone.ao" className={field} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Notice state={saveState} />
          <button type="submit" disabled={saving} className="pz-gradient ml-auto shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
            {saving ? "A guardar…" : "Guardar definições"}
          </button>
        </div>
      </form>

      <form action={testAction} className={card}>
        <div className="mb-3 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><Send className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">Testar envio</h2>
            <p className="mt-0.5 text-sm text-muted">Guarda as definições e envia um email de teste para confirmar.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input name="to" type="email" defaultValue={testTo} placeholder="email de destino" className={`${field} flex-1`} />
          <button type="submit" disabled={testing} className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft disabled:opacity-60">
            {testing ? "A enviar…" : "Enviar email de teste"}
          </button>
        </div>
        <div className="mt-3"><Notice state={testState} /></div>
      </form>
    </div>
  );
}
