"use client";

import { useState, useTransition } from "react";
import { Smartphone, RefreshCw } from "lucide-react";
import { chargeExpress, checkExpress } from "@/server/actions/payments";

const btn = "inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-soft disabled:opacity-50";

export function ExpressCharge({ paymentId, hasTx }: { paymentId: number; hasTx: boolean }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [pending, start] = useTransition();

  const send = () => {
    const fd = new FormData();
    fd.set("paymentId", String(paymentId));
    fd.set("mobile", mobile);
    start(() => chargeExpress(fd));
    setOpen(false);
  };
  const check = () => {
    const fd = new FormData();
    fd.set("paymentId", String(paymentId));
    start(() => checkExpress(fd));
  };

  if (open) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="9XXXXXXXX"
          inputMode="numeric"
          className="w-28 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs focus:border-brand-purple focus:outline-none"
        />
        <button onClick={send} disabled={pending} className="pz-gradient rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Enviar</button>
        <button onClick={() => setOpen(false)} className="text-xs text-soft hover:text-muted">✕</button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {hasTx && (
        <button onClick={check} disabled={pending} className={btn} title="Verificar estado da cobrança Express">
          <RefreshCw className="size-3.5" /> Verificar
        </button>
      )}
      <button onClick={() => setOpen(true)} disabled={pending} className={btn} title="Cobrar por Multicaixa Express (push para o telemóvel)">
        <Smartphone className="size-3.5" /> Express
      </button>
    </span>
  );
}
