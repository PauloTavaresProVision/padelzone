import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenCompetitions, getPlayersForPicker } from "@/server/entries";
import { RegisterSelfForm } from "@/components/register-self-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscrever · PadelZone" };

export default async function InscreverPage() {
  const user = await getCurrentUser();
  const [competitions, allPlayers, mePlayer] = await Promise.all([
    getOpenCompetitions(),
    getPlayersForPicker(),
    prisma.player.findUnique({ where: { userId: user!.id }, select: { id: true } }),
  ]);
  const players = allPlayers.filter((p) => p.id !== mePlayer?.id);

  const comps = competitions.map((c) => ({
    id: c.id,
    name: c.name,
    club: c.club.name,
    startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
    endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
    categories: c.categories.map((k) => ({
      id: k.id,
      name: k.name,
      gender: k.gender,
      unit: k.unit,
      price: k.price == null ? null : Number(k.price),
      maxEntries: k.maxEntries,
      inscritos: k._count.entries,
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Inscrever num torneio</h1>
        <p className="mt-1 text-sm text-muted">Escolhe o torneio, a categoria e a tua dupla.</p>
      </div>

      {comps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-sm text-muted">Não há torneios com inscrições abertas neste momento.</p>
          <Link href="/torneios" className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline">Ver os meus torneios</Link>
        </div>
      ) : (
        <RegisterSelfForm competitions={comps} players={players} />
      )}
    </div>
  );
}
