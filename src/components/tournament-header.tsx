import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TournamentHeaderClient } from "./tournament-header-client";
import type { HelpItem } from "./help-button";

export async function TournamentHeader({ compId, title, subtitle, help }: { compId: number; title: string; subtitle?: string; help?: HelpItem[] }) {
  const comp = await prisma.competition.findUnique({ where: { id: compId }, select: { name: true, clubId: true } });
  if (!comp) return null;
  const [competitions, user] = await Promise.all([
    prisma.competition.findMany({ where: { clubId: comp.clubId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    getCurrentUser(),
  ]);
  return (
    <TournamentHeaderClient
      title={title}
      subtitle={subtitle}
      currentId={compId}
      currentName={comp.name}
      competitions={competitions}
      help={help}
      userName={user?.name ?? ""}
    />
  );
}
