import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyEntries } from "@/server/entries";
import { formatKz } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "As minhas inscrições · PadelZone" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-warning-bg text-warning" },
  CONFIRMED: { label: "Confirmada", cls: "bg-success-bg text-success" },
  WAITLIST: { label: "Lista de espera", cls: "bg-primary-light text-brand-purple" },
  WITHDRAWN: { label: "Retirada", cls: "bg-danger-bg text-danger" },
};

export default async function InscricoesPage() {
  const user = await getCurrentUser();
  const entries = await getMyEntries(user!.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-zinc-900">As minhas inscrições</h1>
          <p className="mt-1 text-sm text-muted">As tuas inscrições e o estado do pagamento.</p>
        </div>
        <Link href="/inscrever" className="pz-gradient inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">
          <Plus className="size-4" /> Nova
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-sm text-muted">Ainda não te inscreveste em torneios.</p>
          <Link href="/inscrever" className="pz-gradient mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white">
            <Plus className="size-4" /> Inscrever-me
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const st = STATUS[entry.status] ?? STATUS.PENDING;
            const name = entry.team ? `${entry.team.player1.name}${entry.team.player2 ? " / " + entry.team.player2.name : ""}` : "Individual";
            const pay = entry.payments[0];
            const price = entry.category.price == null ? 0 : Number(entry.category.price);
            return (
              <div key={entry.id} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{name}</p>
                    <p className="truncate text-sm text-muted">{entry.category.name} · {entry.category.competition.name}</p>
                    <p className="truncate text-xs text-soft">{entry.category.competition.club.name}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>

                {price > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                    <span className="font-medium text-muted">{formatKz(price)}</span>
                    {pay?.status === "PAID" ? (
                      <span className="font-semibold text-success">Pago</span>
                    ) : (
                      <Link href="/pagamentos" className="font-semibold text-brand-purple hover:underline">Pagamento pendente →</Link>
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
