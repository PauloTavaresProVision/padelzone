"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { requestReset } from "@/server/actions/auth";
import { authField } from "@/components/auth-bits";

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState(requestReset, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="email" type="email" required placeholder="o teu email@exemplo.com" className={authField} />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>
      )}

      {state?.ok && (
        <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40">
          Se a conta existir, enviámos instruções por email.
          {state.devLink && (
            <span className="mt-2 block text-emerald-800">
              (modo dev, sem email){" "}
              <Link href={state.devLink} className="font-medium underline">
                repor agora
              </Link>
            </span>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "A enviar…" : <>Enviar instruções <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
