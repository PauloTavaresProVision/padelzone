"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { login } from "@/server/actions/auth";
import { GoogleButton, authField } from "@/components/auth-bits";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="email" type="email" required placeholder="o teu email@exemplo.com" className={authField} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Palavra-passe</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            placeholder="••••••••••"
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
        <div className="mt-1.5 text-right">
          <Link href="/recuperar" className="text-sm text-brand-purple hover:underline">
            Esqueci-me da palavra-passe
          </Link>
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
        {pending ? "A entrar…" : <>Entrar <ArrowRight className="size-4" /></>}
      </button>

      <div className="flex items-center gap-3 py-0.5">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs text-zinc-400">ou</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <GoogleButton />
    </form>
  );
}
