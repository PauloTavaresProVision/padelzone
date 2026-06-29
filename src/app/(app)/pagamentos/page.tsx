import { Wallet, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyPayments } from "@/server/player-area";
import { formatKz } from "@/lib/money";
import { PaymentChoice } from "@/components/payment-choice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamentos · PadelZone" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  PAID: { label: "Pago", cls: "bg-success-bg text-success" },
  FAILED: { label: "Falhou", cls: "bg-danger-bg text-danger" },
  REFUNDED: { label: "Reembolsado", cls: "bg-surface-soft text-muted" },
};
const METHOD: Record<string, string> = {
  REFERENCE: "Referência Multicaixa",
  MULTICAIXA_EXPRESS: "Multicaixa Express",
  BANK_TRANSFER: "Transferência",
  UNITEL_MONEY: "Unitel Money",
  AFRICELL_MONEY: "Africell Money",
  CASH: "Numerário",
};

export default async function PagamentosPage({ searchParams }: { searchParams: Promise<{ pay?: string }> }) {
  const { pay } = await searchParams;
  const payEntryId = pay ? Number(pay) : null;
  const user = await getCurrentUser();
  const payments = await getMyPayments(user!.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted">Os pagamentos das tuas inscrições.</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Wallet className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não tens pagamentos. Aparecem aqui quando te inscreveres num torneio com inscrição paga.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const st = STATUS[p.status] ?? STATUS.PENDING;
            const unpaid = p.status !== "PAID";
            return (
              <div key={p.id} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{p.competition}</p>
                    <p className="truncate text-xs text-muted">{p.category} · {METHOD[p.method] ?? p.method}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums text-zinc-900">{formatKz(p.amount)}</p>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                </div>

                {unpaid && p.entryId && (
                  <div className="mt-3 border-t border-line pt-3">
                    {p.full ? (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
                        <AlertTriangle className="size-4" /> Categoria cheia — já não é possível pagar.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted">{p.status === "FAILED" ? "O pagamento falhou. Podes tentar de novo." : "Escolhe como pagar."}</span>
                          <PaymentChoice entryId={p.entryId} full={p.full} autoOpen={p.entryId === payEntryId} reference={p.referenceEnabled} express={p.expressEnabled} />
                        </div>
                        {p.method === "REFERENCE" && p.reference && (
                          <div className="mt-3 rounded-xl border border-line bg-surface-soft/60 p-3">
                            <p className="text-xs text-soft">Paga em qualquer Multicaixa / app do banco com:</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-800">
                              <span>Entidade <strong className="font-mono">{p.entityId ?? "—"}</strong></span>
                              <span>Referência <strong className="font-mono">{p.reference}</strong></span>
                              <span>Montante <strong className="tabular-nums">{formatKz(p.amount)}</strong></span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
