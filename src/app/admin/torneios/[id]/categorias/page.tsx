import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { getClubCategories } from "@/server/club-categories";
import { CategoriesManager } from "@/components/categories-manager";
import { TournamentHeader } from "@/components/tournament-header";

export const dynamic = "force-dynamic";

export default async function TournamentCategoriasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const cats = comp.categories.map((c) => ({
    id: c.id,
    name: c.name,
    gender: c.gender,
    price: c.price == null ? null : Number(c.price),
    maxEntries: c.maxEntries,
    latestStart: c.latestStart,
    entries: c._count.entries,
    format: c.format,
    numGroups: c.numGroups,
    qualifiersPerGroup: c.qualifiersPerGroup,
    useSeeds: c.useSeeds,
  }));
  const templates = await getClubCategories(comp.clubId);

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Categorias"
        help={[
          { label: "Adicionar do catálogo", desc: "As categorias vêm do catálogo do clube. Adiciona aqui as que este torneio vai ter; o preço e o formato definem-se por categoria." },
          {
            label: "Preço e limite",
            desc: "Preço de inscrição em Kwanzas (ex.: 15.000,00 Kz) e número máximo de duplas. Acima do limite, as novas inscrições vão para lista de espera.",
          },
          {
            label: "Formato: Eliminatórias (quadro)",
            desc: "Quem perde está eliminado. As duplas avançam num quadro a eliminar até à final.",
            bullets: ["Uma dupla pode jogar só 1 jogo se perder logo.", "É rápido, ideal para muitas duplas e pouco tempo."],
          },
          {
            label: "Formato: Grupos + Eliminatórias",
            desc: "Primeiro uma fase de grupos (todos contra todos dentro do grupo); os melhores de cada grupo apuram-se para um quadro de eliminatórias que decide o vencedor.",
            bullets: ["Garante vários jogos a cada dupla, mesmo que perca.", "É o formato mais comum em torneios.", "Defines o nº de grupos e quantas duplas se apuram por grupo."],
          },
          {
            label: "Formato: Liga / Só grupos",
            desc: "Todos jogam contra todos e ganha quem somar mais pontos na classificação, sem eliminatórias.",
            bullets: ["Bom para ligas/campeonatos, onde interessa toda a gente jogar muito."],
          },
          {
            label: "Nº de grupos / Apurados por grupo",
            desc: "Só aparecem nos formatos com grupos. 'Nº de grupos' = em quantos grupos divides as duplas; 'Apurados por grupo' = quantas de cada grupo passam à fase seguinte (ex.: 2 = os dois primeiros).",
          },
          {
            label: "Tem cabeças de série",
            desc: "Liga a proteção das duplas mais fortes no sorteio (defines quais no separador Inscrições). Desliga para um sorteio 100% aleatório.",
          },
        ]}
      />
      <CategoriesManager competitionId={comp.id} categories={cats} templates={templates} canManage />
    </div>
  );
}
