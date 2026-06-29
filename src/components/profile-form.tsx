"use client";

import { useActionState, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { updateProfile } from "@/server/actions/profile";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-medium text-muted";
const SIZES = ["", "XS", "S", "M", "L", "XL", "XXL"];

type Initial = { name: string; bio: string; city: string; phone: string; shirtSize: string; photoUrl: string | null };

const initials = (n: string) => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [preview, setPreview] = useState<string | null>(null);
  const photo = preview ?? initial.photoUrl;

  return (
    <form action={action} className="space-y-4">
      {/* Foto */}
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-light text-xl font-bold text-brand-purple">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-full object-cover" />
          ) : (
            initials(initial.name || "?")
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">
          <ImagePlus className="size-4" /> {initial.photoUrl ? "Mudar foto" : "Adicionar foto"}
          <input
            type="file"
            name="photo"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
      </div>

      <div>
        <label className={labelCls}>Nome</label>
        <input name="name" defaultValue={initial.name} required className={field} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Cidade</label>
          <input name="city" defaultValue={initial.city} placeholder="Ex.: Luanda" className={field} />
        </div>
        <div>
          <label className={labelCls}>Telefone / WhatsApp</label>
          <input name="phone" defaultValue={initial.phone} placeholder="+244 …" className={field} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Tamanho de t-shirt</label>
        <select name="shirtSize" defaultValue={initial.shirtSize} className={field}>
          {SIZES.map((s) => (
            <option key={s} value={s}>{s || "—"}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Bio</label>
        <textarea name="bio" defaultValue={initial.bio} rows={3} placeholder="Conta um pouco sobre ti…" className={field} />
      </div>

      {state?.error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
          <Check className="size-4" /> Perfil guardado.
        </p>
      )}

      <button type="submit" disabled={pending} className="pz-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
        {pending ? "A guardar…" : "Guardar alterações"}
      </button>
    </form>
  );
}
