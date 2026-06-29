import { notFound } from "next/navigation";
import { Paperclip, Trash2, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { TournamentHeader } from "@/components/tournament-header";
import { RulesEditor } from "@/components/rules-editor";
import { addAttachment, removeAttachment } from "@/server/actions/rules";

export const dynamic = "force-dynamic";

export default async function RegulamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Regulamento"
        subtitle="O que os jogadores e o público vão ver no torneio."
        help={[
          { label: "Texto", desc: "Escreve as regras com formatação, títulos, listas e imagens." },
          { label: "Anexos", desc: "Junta o regulamento oficial ou outros documentos em PDF." },
          { label: "Onde aparece", desc: "Na inscrição (ligado ao 'aceito o regulamento') e na página pública do torneio." },
        ]}
      />

      <RulesEditor competitionId={comp.id} initialHtml={comp.rules ?? ""} />

      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-zinc-900"><Paperclip className="size-4 text-soft" /> Anexos</h2>
        <p className="mb-3 text-sm text-muted">PDF ou imagens (ex.: regulamento oficial, mapa, cartaz).</p>
        {comp.attachments.length > 0 && (
          <ul className="mb-4 space-y-2">
            {comp.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-soft/40 px-3 py-2">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-brand-purple hover:underline">
                  <FileText className="size-4 shrink-0" /> <span className="truncate">{a.name}</span>
                </a>
                <form action={removeAttachment}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" aria-label="Remover anexo" className="grid size-8 shrink-0 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger"><Trash2 className="size-4" /></button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addAttachment} className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <input type="hidden" name="competitionId" value={comp.id} />
          <input type="file" name="file" accept="image/*,application/pdf" required className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-purple" />
          <button type="submit" className="pz-gradient shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95">Adicionar anexo</button>
        </form>
      </section>
    </div>
  );
}
