"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { submitMatchResult, type SetScore } from "@/server/results-engine";
import { notifyPlayers } from "@/lib/notify";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR", "STAFF"];

export async function submitResult(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const matchId = Number(formData.get("matchId"));

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      stage: { include: { category: { include: { competition: { include: { club: { select: { slug: true } } } } } } } },
    },
  });
  if (!match) throw new Error("Jogo não encontrado.");

  const clubId = match.stage.category.competition.clubId;
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");

  const sets: SetScore[] = [];
  for (let i = 1; i <= 3; i++) {
    const a = formData.get(`s${i}a`);
    const b = formData.get(`s${i}b`);
    if (a != null && a !== "" && b != null && b !== "") {
      sets.push({ a: Number(a), b: Number(b) });
    }
  }

  await submitMatchResult(matchId, sets);

  // Avisar as duas duplas do resultado (best-effort).
  try {
    const done = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        stage: { select: { category: { select: { name: true, competition: { select: { name: true } } } } } },
        sides: { include: { team: true, players: { select: { playerId: true } } } },
      },
    });
    if (done) {
      const ids: (number | null)[] = [];
      for (const s of done.sides) {
        if (s.team) ids.push(s.team.player1Id, s.team.player2Id);
        for (const p of s.players) ids.push(p.playerId);
      }
      const score = sets.map((x) => `${x.a}-${x.b}`).join(" ");
      await notifyPlayers(
        ids,
        `O resultado do teu jogo (${done.stage.category.name}, ${done.stage.category.competition.name}) foi registado: ${score}.`,
        "Resultado registado · PadelZone",
      );
    }
  } catch {
    /* notificação não bloqueia */
  }

  revalidatePath("/admin", "layout");
}
