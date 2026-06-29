import { prisma } from "@/lib/prisma";

export function getMyClubs(userId: number) {
  return prisma.club.findMany({
    where: { users: { some: { userId } } },
    include: { _count: { select: { competitions: true, courts: true, users: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function getClub(slug: string) {
  return prisma.club.findUnique({
    where: { slug },
    include: {
      courts: { orderBy: { id: "asc" } },
      users: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { id: "asc" },
      },
      invites: { where: { acceptedAt: null }, orderBy: { id: "asc" } },
      _count: { select: { competitions: true } },
    },
  });
}

export async function getMyRole(clubId: number, userId: number) {
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  return m?.role ?? null;
}

// O clube do organizador (um clube por admin). Usado por toda a área /admin.
export async function getMyClub(userId: number) {
  const m = await prisma.clubUser.findFirst({
    where: { userId, role: { in: ["CLUB_OWNER", "DIRECTOR", "STAFF", "REFEREE"] } },
    orderBy: { id: "asc" },
    include: { club: true },
  });
  return m?.club ?? null;
}
