"use client";

import { useActionState, useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { resetPassword } from "@/server/actions/auth";
import { authField } from "@/components/auth-bits";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nova palavra-passe</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            placeholder="mínimo 6 caracteres"
            className={`${authField} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "A guardar…" : <>Definir nova palavra-passe <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
