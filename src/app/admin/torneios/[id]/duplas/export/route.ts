import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";

const STATUS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  WAITLIST: "Lista de espera",
  WITHDRAWN: "Desistiu",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) return new Response("Sem sessão", { status: 403 });
  const club = await getMyClub(userId);
  if (!club) return new Response("Sem clube", { status: 403 });
  const comp = await prisma.competition.findUnique({ where: { id: Number(id) }, select: { clubId: true, slug: true } });
  if (!comp || comp.clubId !== club.id) return new Response("Não encontrado", { status: 404 });

  const entries = await prisma.entry.findMany({
    where: { teamId: { not: null }, category: { competitionId: Number(id) } },
    include: { team: { include: { player1: true, player2: true } }, category: { select: { name: true } } },
  });

  const rows = entries
    .filter((e) => e.team)
    .map((e) => ({
      p1: e.team!.player1.name,
      p2: e.team!.player2?.name ?? "",
      category: e.category.name,
      seed: e.seed ? String(e.seed) : "",
      status: STATUS[e.status] ?? e.status,
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "pt"));

  const clean = (s: string) => s.replace(/[;\n\r]/g, " ");
  const csv =
    "﻿" +
    [
      "Jogador 1;Jogador 2;Categoria;Cabeça de série;Estado",
      ...rows.map((r) => `${clean(r.p1)};${clean(r.p2)};${clean(r.category)};${r.seed};${r.status}`),
    ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duplas-${comp.slug}.csv"`,
    },
  });
}
