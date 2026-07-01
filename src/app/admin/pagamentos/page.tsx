import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CreditCard, RefreshCw, FileText, BadgeCheck, Wallet, Clock, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { prisma } from "@/lib/prisma";
import { savePaymentConfig, generateReferences, syncPayments, markPaymentPaid } from "@/server/actions/payments";
import { formatKz } from "@/lib/money";
import { ExpressCharge } from "@/components/express-charge";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";
const primaryBtn = "pz-gradient inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";
const ghostBtn = "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  PAID: { label: "Pago", cls: "bg-success-bg text-success" },
  FAILED: { label: "Falhou", cls: "bg-danger-bg text-danger" },
  REFUNDED: { label: "Reembolsado", cls: "bg-surface-soft text-muted" },
};
const METHOD: Record<string, string> = {
  REFERENCE: "Referência MC",
  MULTICAIXA_EXPRESS: "Multicaixa Express",
  BANK_TRANSFER: "Transferência",
  UNITEL_MONEY: "Unitel Money",
  AFRICELL_MONEY: "Africell Money",
  CASH: "Numerário",
};

type Pay = Awaited<ReturnType<typeof loadPayments>>[number];
function loadPayments(clubId: number) {
  return prisma.payment.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      competition: { select: { name: true } },
      entry: { include: { player: true, team: { include: { player1: true, player2: true } }, category: { select: { name: true } } } },
    },
  });
}
function payerName(p: Pay) {
  const e = p.entry;
  if (!e) return "—";
  if (e.team) return e.team.player2 ? `${e.team.player1.name} / ${e.team.player2.name}` : e.team.player1.name;
  return e.player?.name ?? "—";
}

export default async function PagamentosPage() {
  const user = await getCurrentUser();
  const my = await getMyClub(user!.id);
  if (!my) notFound();
  const club = await prisma.club.findUnique({ where: { id: my.id } });
  if (!club) notFound();

  const payments = await loadPayments(club.id);
  const paid = payments.filter((p) => p.status === "PAID");
  const pending = payments.filter((p) => p.status === "PENDING");
  const totalPaid = paid.reduce((a, p) => a + Number(p.amount), 0);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3010";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const webhookUrl = `${proto}://${host}/api/payments/proxypay`;
  const configured = !!club.proxypayApiKey;

  const metrics = [
    { icon: Wallet, label: "Recebido", value: formatKz(totalPaid, { zero: "0,00 Kz" }) },
    { icon: BadgeCheck, label: "Pagos", value: String(paid.length) },
    { icon: Clock, label: "Pendentes", value: String(pending.length) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Pagamentos"
        subtitle={`Referências Multicaixa (ProxyPay) das inscrições do ${club.name}.`}
        help={[
          { label: "Métodos e credenciais", desc: "Escolhe os métodos (Referência Multicaixa e/ou Multicaixa Express) e mete as credenciais ProxyPay de cada um." },
          { label: "Gerar e sincronizar", desc: "Gera referências para as inscrições confirmadas; o cliente paga no Multicaixa e a sincronização marca como pago." },
        ]}
      />

      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple"><m.icon className="size-[18px]" /></span>
            <p className="mt-3 text-2xl font-bold leading-none text-zinc-900">{m.value}</p>
            <p className="mt-1 text-xs text-muted">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Configuração ProxyPay */}
      <section className={card}>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><CreditCard className="size-[18px]" /></span>
          <div>
            <h2 className="text-base font-bold leading-tight text-zinc-900">Configuração da ProxyPay (Multicaixa)</h2>
            <p className="mt-0.5 text-sm text-muted">
              {configured ? "Credenciais guardadas." : "Obtém a Entidade e a chave de API no teu painel ProxyPay e cola-as aqui."}
            </p>
          </div>
        </div>

        <form action={savePaymentConfig} className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-soft/40 p-4">
            <p className="mb-2.5 text-sm font-semibold text-zinc-900">Métodos de pagamento ativos</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
                <input type="checkbox" name="referenceEnabled" defaultChecked={club.referenceEnabled} className="size-4 rounded border-line text-brand-purple focus:ring-brand-purple" />
                Referência Multicaixa
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
                <input type="checkbox" name="expressEnabled" defaultChecked={club.expressEnabled} className="size-4 rounded border-line text-brand-purple focus:ring-brand-purple" />
                Multicaixa Express
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
                <input type="checkbox" name="transferEnabled" defaultChecked={club.transferEnabled} className="size-4 rounded border-line text-brand-purple focus:ring-brand-purple" />
                Transferência bancária
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
                <input type="checkbox" name="proxypaySandbox" defaultChecked={club.proxypaySandbox} className="size-4 rounded border-line text-brand-purple focus:ring-brand-purple" />
                Modo de testes (sandbox)
              </label>
            </div>
            <p className="mt-2 text-xs text-soft">Escolhe um método ou ambos. Cada um precisa das suas credenciais abaixo.</p>
          </div>
          <p className="text-sm font-semibold text-zinc-900">Referência Multicaixa</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Entidade</label>
              <input name="entityId" defaultValue={club.proxypayEntityId ?? ""} placeholder="Ex.: 00422" className={field} />
            </div>
            <div>
              <label className={label}>Chave de API</label>
              <input type="password" name="apiKey" autoComplete="off" placeholder={configured ? "•••••••• (guardada, deixa em branco para manter)" : "cola a chave da ProxyPay"} className={field} />
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-semibold text-zinc-900">Multicaixa Express (pagamento por telemóvel)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>POS ID</label>
                <input name="posId" defaultValue={club.mcxPosId ?? ""} placeholder="Ex.: 123" className={field} />
              </div>
              <div>
                <label className={label}>Token Express</label>
                <input type="password" name="expressToken" autoComplete="off" placeholder={club.mcxExpressToken ? "•••••••• (guardado, deixa em branco para manter)" : "token OPG (Bearer)"} className={field} />
              </div>
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-semibold text-zinc-900">Transferência bancária</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>IBAN</label>
                <input name="iban" defaultValue={club.iban ?? ""} placeholder="AO06 0000 0000 0000 0000 0000 0" className={field} />
              </div>
              <div>
                <label className={label}>Titular da conta</label>
                <input name="ibanName" defaultValue={club.ibanName ?? ""} placeholder="Nome do titular" className={field} />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-soft">O jogador vê estes dados, transfere e anexa o comprovativo. Validas o pagamento na lista abaixo (botão “Pago”).</p>
          </div>
          <div>
            <label className={label}>URL do webhook (configura no painel ProxyPay)</label>
            <input readOnly value={webhookUrl} className={`${field} text-muted`} />
            <p className="mt-1 text-xs text-soft">A ProxyPay chama este endereço quando um pagamento é confirmado. Em alternativa, usa o botão “Sincronizar pagamentos”.</p>
          </div>
          <button type="submit" className={primaryBtn}>Guardar configuração</button>
        </form>
      </section>

      {/* Ações (Referência Multicaixa) */}
      {club.referenceEnabled && (
        <div className="flex flex-wrap items-center gap-3">
          <form action={generateReferences}>
            <button type="submit" className={primaryBtn}><FileText className="size-4" /> Gerar referências em falta</button>
          </form>
          <form action={syncPayments}>
            <button type="submit" className={ghostBtn}><RefreshCw className="size-4" /> Sincronizar pagamentos</button>
          </form>
          <span className="text-xs text-soft">Gera para inscrições confirmadas com preço (até 20 por clique). Sincronizar verifica os pagamentos na ProxyPay.</span>
        </div>
      )}

      {/* Lista */}
      <section className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft/60 text-left text-xs font-semibold uppercase tracking-wide text-soft">
                <th className="px-4 py-3">Inscrição</th>
                <th className="px-4 py-3">Torneio</th>
                <th className="px-4 py-3 text-right">Montante</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-soft">Ainda não há pagamentos. Gera as referências das inscrições confirmadas.</td>
                </tr>
              ) : (
                payments.map((p) => {
                  const st = STATUS[p.status] ?? STATUS.PENDING;
                  return (
                    <tr key={p.id} className="transition hover:bg-surface-soft/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{payerName(p)}</p>
                        {p.entry?.category && <p className="text-xs text-muted">{p.entry.category.name}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{p.competition?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">{formatKz(Number(p.amount))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{METHOD[p.method] ?? p.method}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                        {p.method === "BANK_TRANSFER" && p.proofUrl ? (
                          <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans text-brand-purple hover:underline"><FileText className="size-3.5" /> Ver recibo</a>
                        ) : p.reference ? `${club.proxypayEntityId ?? "—"} · ${p.reference}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "PENDING" && (
                          <div className="inline-flex items-center gap-1.5">
                            {club.expressEnabled && <ExpressCharge paymentId={p.id} hasTx={p.method === "MULTICAIXA_EXPRESS" && !!p.externalId} />}
                            <form action={markPaymentPaid}>
                              <input type="hidden" name="paymentId" value={p.id} />
                              <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-success-bg hover:text-success" title="Marcar como pago (numerário/transferência)">
                                <Check className="size-3.5" /> Pago
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
