import { Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyMessages } from "@/server/messages";
import { MessageInbox } from "@/components/message-inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mensagens · PadelZone" };

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function MensagensPage() {
  const user = await getCurrentUser();
  const messages = await getMyMessages(user!.id);
  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Mensagens</h1>
        <p className="mt-1 text-sm text-muted">
          {unread > 0 ? `Tens ${unread} ${unread === 1 ? "mensagem por ler" : "mensagens por ler"}.` : "Avisos e comunicados dos clubes."}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Inbox className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não tens mensagens. Os avisos dos clubes em que jogas aparecem aqui.</p>
        </div>
      ) : (
        <MessageInbox messages={messages.map((m) => ({ id: m.id, subject: m.subject, body: m.body, club: m.club, clubLogo: m.clubLogo, date: dateFmt.format(m.createdAt), read: m.read }))} />
      )}
    </div>
  );
}
