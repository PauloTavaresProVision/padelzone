import { notFound } from "next/navigation";
import { UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { prisma } from "@/lib/prisma";
import { TeamsTable, type TeamRow } from "@/components/teams-table";
import { TournamentHeader } from "@/components/tournament-header";

export const dynamic = "force-dynamic";

export default async function TorneioDuplasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await prisma.competition.findUnique({ where: { id: Number(id) }, select: { id: true, clubId: true, name: true } });
  if (!comp || comp.clubId !== club.id) notFound();

  const entries = await prisma.entry.findMany({
    where: { teamId: { not: null }, category: { competitionId: comp.id } },
    include: {
      team: { include: { player1: true, player2: true } },
      category: { select: { name: true } },
    },
  });

  const rows: TeamRow[] = entries
    .filter((e) => e.team)
    .map((e) => ({
      id: e.id,
      p1: e.team!.player1.name,
      p2: e.team!.player2?.name ?? "—",
      category: e.category.name,
      tournament: comp.name,
      seed: e.seed,
      status: e.status,
    }))
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category, "pt") ||
        (a.seed ?? 9999) - (b.seed ?? 9999) ||
        a.p1.localeCompare(b.p1, "pt"),
    );

  const categories = [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "pt"));

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Duplas"
        subtitle="Pares inscritos neste torneio, por categoria."
        help={[{ label: "Duplas inscritas", desc: "Todas as duplas deste torneio, com a categoria, a cabeça de série e o estado da inscrição. Podes filtrar por categoria e exportar em CSV." }]}
      />
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <UsersRound className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há duplas inscritas neste torneio.</p>
        </div>
      ) : (
        <TeamsTable rows={rows} categories={categories} exportHref={`/admin/torneios/${comp.id}/duplas/export`} showTournament={false} />
      )}
    </div>
  );
}
