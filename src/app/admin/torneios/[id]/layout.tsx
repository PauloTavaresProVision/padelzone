import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { TournamentSidebar } from "@/components/tournament-sidebar";
import { TournamentShell } from "@/components/tournament-shell";

export const dynamic = "force-dynamic";

function fmtRange(s: Date | null, e: Date | null) {
  const f = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(d) : null);
  const a = f(s), b = f(e);
  return a && b ? `${a} – ${b}` : a || b || "";
}

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await prisma.competition.findUnique({
    where: { id: Number(id) },
    select: { id: true, name: true, status: true, clubId: true, startDate: true, endDate: true },
  });
  if (!comp || comp.clubId !== club.id) notFound();

  const [done, total] = await Promise.all([
    prisma.match.count({ where: { stage: { category: { competitionId: comp.id } }, status: "DONE" } }),
    prisma.match.count({ where: { stage: { category: { competitionId: comp.id } } } }),
  ]);
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <TournamentShell
      sidebar={
        <TournamentSidebar
          id={comp.id}
          name={comp.name}
          status={comp.status}
          dateLabel={fmtRange(comp.startDate, comp.endDate)}
          location={club.city ?? ""}
          progress={progress}
        />
      }
    >
      {children}
    </TournamentShell>
  );
}
