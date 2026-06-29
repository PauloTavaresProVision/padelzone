import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompetition } from "@/server/competitions";
import { getCompetitionEntries } from "@/server/entries";
import { getMyClub } from "@/server/clubs";
import { TournamentHeader } from "@/components/tournament-header";
import { InscriptionsManager, type Insc } from "@/components/inscriptions-manager";

export const dynamic = "force-dynamic";

type Entry = Awaited<ReturnType<typeof getCompetitionEntries>>[number];

function entryName(entry: Entry) {
  if (entry.team) {
    return entry.team.player2 ? `${entry.team.player1.name} / ${entry.team.player2.name}` : entry.team.player1.name;
  }
  return `${entry.player?.name ?? "—"} (individual)`;
}

export default async function EntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const entries = await getCompetitionEntries(comp.id);
  const rows: Insc[] = entries.map((e) => ({
    id: e.id,
    name: entryName(e),
    categoryId: e.category.id,
    category: e.category.name,
    status: e.status,
    seed: e.seed,
  }));
  const categories = comp.categories.map((c) => ({ id: c.id, code: c.name }));

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Inscrições"
        subtitle="Gere as inscrições, os estados e as cabeças de série."
        help={[
          { label: "Estados", desc: "Pendente (aguarda confirmação), Confirmada, Lista de espera (excede o limite da categoria) e Retirada (desistiu)." },
          {
            label: "Cabeça de série: o que pôr no campo",
            desc: "Serve para separar as duplas mais fortes no sorteio, para não se encontrarem logo no início do quadro.",
            bullets: [
              "Escreve a ordem de força: 1 na dupla mais forte, 2 na segunda, 3 na terceira, e assim por diante.",
              "Deixa em branco as duplas normais (a grande maioria não leva número).",
              "Costuma marcar-se 2, 4 ou 8 cabeças de série, conforme o tamanho do quadro.",
              "Só tem efeito se a categoria tiver 'Tem cabeças de série' ligado (no separador Categorias).",
            ],
          },
          { label: "Procurar e filtrar", desc: "Filtra por categoria e estado, ou procura por nome. Podes exportar tudo em CSV." },
        ]}
      />
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-sm text-muted">Ainda não há inscrições neste torneio.</p>
        </div>
      ) : (
        <InscriptionsManager rows={rows} categories={categories} exportHref={`/admin/torneios/${comp.id}/inscricoes/export`} />
      )}
    </div>
  );
}
