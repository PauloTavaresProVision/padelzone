import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) return new Response("Sem sessão", { status: 403 });
  const club = await getMyClub(userId);
  if (!club) return new Response("Sem clube", { status: 403 });

  const comp = await prisma.competition.findUnique({ where: { id: Number(id) }, select: { clubId: true, name: true, slug: true } });
  if (!comp || comp.clubId !== club.id) return new Response("Não encontrado", { status: 404 });

  const entries = await prisma.entry.findMany({
    where: { category: { competitionId: Number(id) } },
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

  type Row = { name: string; email: string; phone: string; city: string; count: number };
  const map = new Map<number, Row>();
  const add = (p: { id: number; name: string; email: string | null; phone: string | null; city: string | null; user: { email: string } | null } | null | undefined) => {
    if (!p) return;
    const cur = map.get(p.id) ?? { name: p.name, email: p.email ?? p.user?.email ?? "", phone: p.phone ?? "", city: p.city ?? "", count: 0 };
    cur.count++;
    map.set(p.id, cur);
  };
  for (const e of entries) {
    if (e.player) add(e.player as never);
    if (e.team) {
      add(e.team.player1 as never);
      add(e.team.player2 as never);
    }
  }
  const rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const clean = (s: string) => s.replace(/[;\n\r]/g, " ");
  const csv = "﻿" + ["Nome;Email;Telefone;Cidade;Inscrições", ...rows.map((r) => `${clean(r.name)};${clean(r.email)};${clean(r.phone)};${clean(r.city)};${r.count}`)].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jogadores-${comp.slug}.csv"`,
    },
  });
}
