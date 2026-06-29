"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { markAllMessagesRead } from "@/server/actions/messages";

export type InboxItem = {
  id: number;
  subject: string;
  body: string;
  club: string;
  clubLogo: string | null;
  date: string;
  read: boolean;
};

// Logótipo do clube em caixa branca (fundo branco como nas páginas públicas); inicial como recurso.
function ClubAvatar({ name, logo, lg }: { name: string; logo: string | null; lg?: boolean }) {
  const dim = lg ? "size-10" : "size-9";
  return (
    <span className={`grid ${dim} shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white text-xs font-bold text-soft`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-full object-contain" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function MessageInbox({ messages }: { messages: InboxItem[] }) {
  // Capta as não-lidas no 1.º render para os pontos não desaparecerem ao marcar como lidas.
  const [unreadIds] = useState(() => new Set(messages.filter((m) => !m.read).map((m) => m.id)));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (unreadIds.size > 0) start(() => { markAllMessagesRead(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No telemóvel: selectedId null = mostra a lista; com seleção = mostra a leitura.
  // No desktop: lista e leitura lado a lado (por defeito abre a 1.ª).
  const active = messages.find((m) => m.id === selectedId) ?? messages[0];

  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-5">
      {/* Lista */}
      <div className={`${selectedId === null ? "block" : "hidden"} space-y-2 lg:block`}>
        {messages.map((m) => {
          const unread = unreadIds.has(m.id);
          const isActive = active?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${isActive ? "border-brand-purple/40 bg-primary-light/50" : "border-line bg-surface hover:bg-surface-soft"}`}
            >
              <ClubAvatar name={m.club} logo={m.clubLogo} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`truncate text-sm ${unread ? "font-bold text-zinc-900" : "font-semibold text-zinc-800"}`}>{m.subject}</p>
                  {unread && <span className="size-2 shrink-0 rounded-full bg-brand-purple" />}
                </div>
                <p className="truncate text-xs text-soft">{m.club} · {m.date}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{m.body}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Leitura */}
      <div className={`${selectedId === null ? "hidden" : "block"} lg:block`}>
        {active && (
          <article className="rounded-2xl border border-line bg-surface p-5 pz-shadow-soft lg:sticky lg:top-4">
            <button onClick={() => setSelectedId(null)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple lg:hidden">
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <header className="flex items-center gap-3 border-b border-line pb-4">
              <ClubAvatar name={active.club} logo={active.clubLogo} lg />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{active.club}</p>
                <p className="text-xs text-soft">{active.date}</p>
              </div>
            </header>
            <h2 className="mt-4 text-lg font-bold leading-snug text-zinc-900">{active.subject}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{active.body}</p>
          </article>
        )}
      </div>
    </div>
  );
}
