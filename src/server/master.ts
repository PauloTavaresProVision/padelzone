import { prisma } from "@/lib/prisma";

const ORDER: Record<string, number> = { PENDING: 0, ACTIVE: 1, SUSPENDED: 2 };

export async function getContactMessages() {
  return prisma.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }] });
}

export async function getUnhandledContactCount() {
  return prisma.contactMessage.count({ where: { handled: false } });
}

export async function getMasterStats() {
  const [total, pending, active, suspended] = await Promise.all([
    prisma.club.count(),
    prisma.club.count({ where: { status: "PENDING" } }),
    prisma.club.count({ where: { status: "ACTIVE" } }),
    prisma.club.count({ where: { status: "SUSPENDED" } }),
  ]);
  return { total, pending, active, suspended };
}

export async function getMasterClubs() {
  const clubs = await prisma.club.findMany({
    include: {
      users: { where: { role: "CLUB_OWNER" }, include: { user: { select: { name: true, email: true } } }, take: 1 },
      _count: { select: { competitions: true, players: true } },
    },
  });
  return clubs
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      logoUrl: c.logoUrl,
      status: c.status as string,
      accessStart: c.accessStart,
      accessEnd: c.accessEnd,
      approvedAt: c.approvedAt,
      createdAt: c.createdAt,
      owner: c.users[0]?.user ?? null,
      competitions: c._count.competitions,
      players: c._count.players,
    }))
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.createdAt.getTime() - a.createdAt.getTime());
}
