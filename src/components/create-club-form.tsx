"use client";

import { useActionState } from "react";
import { createClub } from "@/server/actions/clubs";

const field =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelCls = "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function CreateClubForm() {
  const [state, action, pending] = useActionState(createClub, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelCls}>Nome do clube</label>
        <input name="name" required placeholder="Nome do clube" className={field} />
      </div>

      <div>
        <label className={labelCls}>Cidade</label>
        <input name="city" placeholder="Cidade" className={field} />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "A criar…" : "Criar clube"}
      </button>
    </form>
  );
}
