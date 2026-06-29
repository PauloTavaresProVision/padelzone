import { notFound } from "next/navigation";
import { MessageSquare, Send, Users, MailCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getMessageAudiences, getClubMessages, getClubPlayerScope } from "@/server/messages";
import { MessageComposer } from "@/components/message-composer";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function MensagensPage() {
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const [audiences, messages, scope] = await Promise.all([getMessageAudiences(club.id), getClubMessages(club.id), getClubPlayerScope(club.id)]);
  const totalSent = messages.reduce((a, m) => a + m.total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Mensagens"
        subtitle="Envia avisos e comunicados aos jogadores do clube."
        help={[
          { label: "Para quem", desc: "Escolhe todos os jogadores do clube, os inscritos num torneio, ou um jogador específico." },
          { label: "Como chega", desc: "A mensagem aparece no menu Mensagens de cada jogador, dentro da plataforma; vês quantos já a leram." },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Compor */}
        <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple"><Send className="size-[18px]" /></span>
            <h2 className="text-base font-bold text-zinc-900">Nova mensagem</h2>
          </div>
          <MessageComposer audiences={audiences} players={scope.players} allCount={scope.allCount} />
        </section>

        {/* Métricas */}
        <div className="space-y-3">
          <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple"><MessageSquare className="size-[18px]" /></span>
            <p className="mt-3 text-2xl font-bold leading-none text-zinc-900">{messages.length}</p>
            <p className="mt-1 text-xs text-muted">Mensagens enviadas</p>
          </div>
          <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-light text-brand-purple"><Users className="size-[18px]" /></span>
            <p className="mt-3 text-2xl font-bold leading-none text-zinc-900">{totalSent}</p>
            <p className="mt-1 text-xs text-muted">Entregas a jogadores</p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-base font-bold text-zinc-900">Enviadas</h2>
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            Ainda não enviaste mensagens. Compõe a primeira acima.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-zinc-900">{m.subject}</p>
                  <span className="shrink-0 text-xs text-soft">{dateFmt.format(m.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{m.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-soft" /> {m.audienceLabel}</span>
                  <span className="inline-flex items-center gap-1.5"><MailCheck className="size-3.5 text-soft" /> {m.read}/{m.total} lidas</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
