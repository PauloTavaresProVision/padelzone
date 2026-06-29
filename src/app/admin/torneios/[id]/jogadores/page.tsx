import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { prisma } from "@/lib/prisma";
import { TournamentHeader } from "@/components/tournament-header";
import { PlayersTable, type Player } from "@/components/players-table";

export const dynamic = "force-dynamic";

export default async function TorneioJogadoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const comp = await prisma.competition.findUnique({ where: { id: Number(id) }, select: { id: true, clubId: true } });
  if (!comp || comp.clubId !== club.id) notFound();

  const entries = await prisma.entry.findMany({
    where: { category: { competitionId: comp.id } },
    include: {
      player: { include: { user: { select: { email: true } } } },
      team: {
        include: {
          player1: { include: { user: { select: { email: true } } } },
          player2: { include: { user: { select: { email: true } } } },
        },
      },
    },
  });

  type P = { id: number; name: string; gender: string | null; email: string | null; phone: string | null; city: string | null; shirtSize: string | null; user: { email: string } | null };
  const map = new Map<number, Player>();
  const add = (p: P | null | undefined) => {
    if (!p) return;
    const cur =
      map.get(p.id) ??
      {
        id: p.id,
        name: p.name,
        email: p.email ?? null,
        accountEmail: p.user?.email ?? null,
        phone: p.phone ?? null,
        city: p.city ?? null,
        gender: p.gender ?? null,
        shirtSize: p.shirtSize ?? null,
        entries: 0,
      };
    cur.entries++;
    map.set(p.id, cur);
  };
  for (const e of entries) {
    if (e.player) add(e.player as P);
    if (e.team) {
      add(e.team.player1 as P);
      add(e.team.player2 as P);
    }
  }
  const players = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));

  return (
    <div className="space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Jogadores"
        subtitle="Jogadores inscritos neste torneio."
        help={[{ label: "Jogadores inscritos", desc: "Todos os jogadores com inscrição neste torneio, em qualquer categoria. Podes procurar, editar contactos e exportar em CSV." }]}
      />

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Users className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há jogadores inscritos neste torneio.</p>
        </div>
      ) : (
        <PlayersTable players={players} exportHref={`/admin/torneios/${comp.id}/jogadores/export`} />
      )}
    </div>
  );
}
