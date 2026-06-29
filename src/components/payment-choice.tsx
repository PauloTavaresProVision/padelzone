"use client";

import { useState, useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, X, Loader2, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { playerPayReference, playerPayExpress, checkExpressCharge, simulateExpressPayment, type ExpressCharge } from "@/server/actions/player-payments";
import { formatKz } from "@/lib/money";

// Mostra o logótipo do método (coloca os ficheiros em public/); cai para um ícone se ainda não existir.
function MethodLogo({ src, fallback }: { src: string; fallback: ReactNode }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-soft">
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" onError={() => setOk(false)} />
      ) : (
        fallback
      )}
    </span>
  );
}

export function PaymentChoice({ entryId, full, autoOpen = false, reference = true, express = true }: { entryId: number; full: boolean; autoOpen?: boolean; reference?: boolean; express?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [mode, setMode] = useState<"choose" | "qr">("choose");
  const [charge, setCharge] = useState<ExpressCharge | null>(null);
  const [result, setResult] = useState<"waiting" | "paid" | "failed">("waiting");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [checking, setChecking] = useState(false);

  const close = () => { setOpen(false); setMode("choose"); setCharge(null); setResult("waiting"); setErr(null); };

  const payRef = () => {
    setErr(null);
    start(async () => {
      try { await playerPayReference(entryId); close(); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : "Falhou."); }
    });
  };

  const payExpress = () => {
    setErr(null);
    start(async () => {
      try {
        const c = await playerPayExpress(entryId);
        setCharge(c); setMode("qr"); setResult("waiting");
      } catch (e) { setErr(e instanceof Error ? e.message : "Falhou."); }
    });
  };

  const verify = async () => {
    setChecking(true);
    try {
      const r = await checkExpressCharge(entryId);
      if (r === "paid") { setResult("paid"); setTimeout(() => { close(); router.refresh(); }, 1600); }
      else if (r === "failed") setResult("failed");
    } finally { setChecking(false); }
  };

  const sim = async (accept: boolean) => {
    setChecking(true);
    try {
      const r = await simulateExpressPayment(entryId, accept);
      if (r === "paid") { setResult("paid"); setTimeout(() => { close(); router.refresh(); }, 1600); }
      else if (r === "failed") setResult("failed");
    } finally { setChecking(false); }
  };

  // Polling automático enquanto o QR está no ecrã.
  useEffect(() => {
    if (mode !== "qr" || result !== "waiting") return;
    const iv = setInterval(() => { void verify(); }, 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, result, entryId]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="pz-gradient rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-95">
        Pagar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={close}>
          <div className="pz-shadow-card w-full max-w-sm rounded-2xl border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">{mode === "qr" ? "Multicaixa Express" : "Pagar inscrição"}</h3>
              <button onClick={close} aria-label="Fechar" className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-soft"><X className="size-5" /></button>
            </div>

            {full ? (
              <div className="rounded-xl bg-danger-bg p-4 text-center">
                <AlertTriangle className="mx-auto size-7 text-danger" />
                <p className="mt-2 text-sm font-medium text-danger">Esta categoria já está cheia. Já não é possível pagar nem repetir esta inscrição.</p>
              </div>
            ) : mode === "qr" && charge ? (
              <div className="text-center">
                {result === "paid" ? (
                  <div className="py-6">
                    <CheckCircle2 className="mx-auto size-12 text-success" />
                    <p className="mt-2 font-semibold text-zinc-900">Pagamento confirmado!</p>
                  </div>
                ) : result === "failed" ? (
                  <div className="py-4">
                    <AlertTriangle className="mx-auto size-10 text-danger" />
                    <p className="mt-2 font-medium text-danger">O pagamento foi recusado.</p>
                    <button onClick={() => { setMode("choose"); setCharge(null); setResult("waiting"); }} className="pz-gradient mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white">Tentar de novo</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted">Lê o código no <strong className="text-zinc-900">Multicaixa Express</strong> e confirma <strong className="text-zinc-900">{formatKz(charge.amount)}</strong>.</p>
                    <div className="mx-auto mt-3 w-fit rounded-xl border border-line bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={charge.qrcodeUrl} alt="QR-Code Multicaixa Express" className="size-44" />
                    </div>
                    <a href={charge.deeplinkRedirect} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-brand-purple transition hover:bg-surface-soft">
                      <ExternalLink className="size-4" /> Abrir no telemóvel
                    </a>
                    <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                      <Loader2 className="size-3.5 animate-spin" /> À espera da confirmação…
                    </p>
                    <button onClick={() => void verify()} disabled={checking} className="mt-1 text-xs font-medium text-brand-purple hover:underline disabled:opacity-60">
                      {checking ? "A verificar…" : "Já paguei, verificar"}
                    </button>
                    {charge.sandbox && (
                      <div className="mt-3 border-t border-dashed border-line pt-3">
                        <p className="text-[11px] text-soft">Modo de testes (sandbox) — simular:</p>
                        <div className="mt-1.5 flex justify-center gap-2">
                          <button onClick={() => void sim(true)} disabled={checking} className="rounded-lg bg-success-bg px-3 py-1.5 text-xs font-semibold text-success transition hover:opacity-80 disabled:opacity-60">Aceitar</button>
                          <button onClick={() => void sim(false)} disabled={checking} className="rounded-lg bg-danger-bg px-3 py-1.5 text-xs font-semibold text-danger transition hover:opacity-80 disabled:opacity-60">Recusar</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {reference && (
                  <button onClick={payRef} disabled={pending} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:bg-surface-soft disabled:opacity-60">
                    <MethodLogo src="/multicaixa-referencia.png?v=1" fallback={<CreditCard className="size-6 text-brand-purple" />} />
                    <span><p className="font-semibold text-zinc-900">Referência Multicaixa</p><p className="text-xs text-muted">Paga em qualquer ATM ou app do banco.</p></span>
                  </button>
                )}
                {express && (
                  <button onClick={payExpress} disabled={pending} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:bg-surface-soft disabled:opacity-60">
                    <MethodLogo src="/multicaixa-express.png?v=1" fallback={<Smartphone className="size-6 text-brand-purple" />} />
                    <span><p className="font-semibold text-zinc-900">Multicaixa Express</p><p className="text-xs text-muted">Lê um QR-Code e aprova na app.</p></span>
                  </button>
                )}
                {!reference && !express && (
                  <p className="rounded-lg bg-surface-soft px-3 py-2 text-sm text-muted">O pagamento desta inscrição é tratado diretamente com o clube.</p>
                )}
                {pending && <p className="flex items-center gap-2 pt-1 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> A processar…</p>}
              </div>
            )}

            {err && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{err} Podes tentar de novo.</p>}
          </div>
        </div>
      )}
    </>
  );
}
