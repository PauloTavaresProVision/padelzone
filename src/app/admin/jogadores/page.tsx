import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { prisma } from "@/lib/prisma";
import { PlayersTable, type Player } from "@/components/players-table";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AdminJogadoresPage() {
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const entries = await prisma.entry.findMany({
    where: { category: { competition: { clubId: club.id } } },
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
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Jogadores"
        subtitle={`Inscritos nos torneios do ${club.name}`}
        help={[{ label: "Jogadores do clube", desc: "Todos os jogadores inscritos nos torneios do clube. Podes procurar, editar contactos (email, telefone) e exportar em CSV." }]}
      />

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <Users className="mx-auto size-8 text-soft" />
          <p className="mt-2 text-sm text-muted">Ainda não há jogadores inscritos nos teus torneios.</p>
        </div>
      ) : (
        <PlayersTable players={players} exportHref="/admin/jogadores/export" />
      )}
    </div>
  );
}
