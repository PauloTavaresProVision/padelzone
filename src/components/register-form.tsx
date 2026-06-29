"use client";

import { useActionState, useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Trophy, Building2 } from "lucide-react";
import { register } from "@/server/actions/auth";
import { GoogleButton, authField } from "@/components/auth-bits";

const labelCls = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function RegisterForm({ parceiro, convite }: { parceiro?: string; convite?: string }) {
  const [state, formAction, pending] = useActionState(register, null);
  const [show, setShow] = useState(false);
  const [kind, setKind] = useState<"player" | "organizer">("player");

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="type" value={kind} />
      {parceiro && <input type="hidden" name="parceiro" value={parceiro} />}
      {convite && <input type="hidden" name="convite" value={convite} />}

      {parceiro && (
        <div className="rounded-xl border border-brand-purple/30 bg-brand-purple/5 px-3 py-2.5 text-sm text-brand-purple">
          Foste convidado(a) para uma dupla. Cria a tua conta para continuares no torneio.
        </div>
      )}

      {!parceiro && (<>
      {/* Tipo de conta */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setKind("player")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
            kind === "player"
              ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
              : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          <Trophy className="size-4" /> Sou jogador
        </button>
        <button
          type="button"
          onClick={() => setKind("organizer")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
            kind === "organizer"
              ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
              : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          <Building2 className="size-4" /> Sou organizador
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {kind === "player"
          ? "Inscreve-te em torneios de vários clubes."
          : "Cria o teu clube e organiza os teus torneios."}
      </p>
      </>)}

      <div>
        <label className={labelCls}>Nome</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="name" required placeholder="O teu nome" className={authField} />
        </div>
      </div>

      {kind === "organizer" && (
        <div>
          <label className={labelCls}>Nome do clube</label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="clubName" required placeholder="Ex.: Padel Clube Luanda" className={authField} />
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="email" type="email" required placeholder="o teu email@exemplo.com" className={authField} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Palavra-passe</label>
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
        {pending ? "A criar…" : <>{kind === "organizer" ? "Criar conta e clube" : "Criar conta"} <ArrowRight className="size-4" /></>}
      </button>

      {kind === "player" && (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-400">ou</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <GoogleButton />
        </>
      )}
    </form>
  );
}
