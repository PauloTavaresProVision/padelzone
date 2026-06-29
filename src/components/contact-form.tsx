"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { submitContact, type ContactState } from "@/server/actions/contact";
import { useT } from "@/components/i18n-provider";

const field = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";

export function ContactForm() {
  const t = useT();
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success-bg/60 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <p className="mt-3 text-lg font-bold text-zinc-900">{t("Mensagem enviada")}</p>
        <p className="mt-1 text-sm text-muted">{t("Obrigado pelo teu contacto. Respondemos assim que possível.")}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">{t("Nome")}</label>
          <input id="name" name="name" maxLength={120} placeholder={t("O teu nome")} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="email">{t("Email")}</label>
          <input id="email" name="email" type="email" maxLength={160} placeholder="o.teu@email.com" className={field} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="subject">{t("Assunto")}</label>
        <input id="subject" name="subject" maxLength={140} placeholder={t("Em que podemos ajudar?")} className={field} />
      </div>
      <div>
        <label className={label} htmlFor="message">{t("Mensagem")}</label>
        <textarea id="message" name="message" rows={5} placeholder={t("Escreve a tua mensagem…")} className={field} />
      </div>

      {state?.error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="pz-gradient inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
        <Send className="size-4" /> {pending ? t("A enviar…") : t("Enviar mensagem")}
      </button>
    </form>
  );
}
