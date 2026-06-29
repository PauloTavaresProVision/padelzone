import { getCurrentUser } from "@/lib/auth";
import { getCompetition } from "@/server/competitions";
import { getCompetitionEntries } from "@/server/entries";
import { getMyClub } from "@/server/clubs";

function csvCell(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const club = await getMyClub(user.id);
  if (!club) return new Response("Sem permissão", { status: 403 });

  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) {
    return new Response("Não encontrado", { status: 404 });
  }

  const entries = await getCompetitionEntries(comp.id);

  const header = "Categoria;Equipa/Jogador;Estado;Seed;Camisolas";
  const rows = entries.map((entry) => {
    const categoria = entry.category.name;

    const nome = entry.team
      ? entry.team.player2
        ? `${entry.team.player1.name} / ${entry.team.player2.name}`
        : entry.team.player1.name
      : entry.player?.name ?? "";

    const camisolas = entry.team
      ? `${entry.team.player1.shirtSize ?? ""}/${entry.team.player2?.shirtSize ?? ""}`
      : entry.player?.shirtSize ?? "";

    return [
      csvCell(categoria),
      csvCell(nome),
      csvCell(entry.status),
      csvCell(entry.seed != null ? String(entry.seed) : ""),
      csvCell(camisolas),
    ].join(";");
  });

  const csv = "﻿" + [header, ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscricoes-${comp.slug}.csv"`,
    },
  });
}
