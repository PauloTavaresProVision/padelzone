import { prisma } from "@/lib/prisma";

async function myPlayerAndTeams(userId: number) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (!player) return null;
  const teams = await prisma.team.findMany({
    where: { OR: [{ player1Id: player.id }, { player2Id: player.id }] },
    select: { id: true },
  });
  return { player, teamIds: teams.map((t) => t.id) };
}

export type MyTournament = {
  id: number;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  club: { name: string; city: string | null };
  categories: { name: string; entryStatus: string; drawn: boolean }[];
  games: number;
};

// Torneios em que o jogador está inscrito (agrupados), com as suas categorias e nº de jogos.
export async function getMyTournaments(userId: number): Promise<MyTournament[]> {
  const me = await myPlayerAndTeams(userId);
  if (!me) return [];

  const entries = await prisma.entry.findMany({
    where: { OR: [{ playerId: me.player.id }, { teamId: { in: me.teamIds } }] },
    include: {
      category: {
        include: {
          competition: { include: { club: { select: { name: true, city: true } } } },
          _count: { select: { stages: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<number, MyTournament>();
  for (const e of entries) {
    const comp = e.category.competition;
    let cur = map.get(comp.id);
    if (!cur) {
      cur = { id: comp.id, name: comp.name, status: comp.status, startDate: comp.startDate, endDate: comp.endDate, club: comp.club, categories: [], games: 0 };
      map.set(comp.id, cur);
    }
    cur.categories.push({ name: e.category.name, entryStatus: e.status, drawn: e.category._count.stages > 0 });
  }

  const out = [...map.values()];
  for (const t of out) {
    t.games = await prisma.match.count({
      where: {
        stage: { category: { competitionId: t.id } },
        sides: { some: { OR: [{ teamId: { in: me.teamIds } }, { players: { some: { playerId: me.player.id } } }] } },
      },
    });
  }
  return out;
}

export type MyGame = {
  id: number;
  competition: string;
  category: string;
  section: string;
  mine: string;
  opponent: string;
  when: Date | null;
  court: string | null;
  done: boolean;
  won: boolean | null;
  sets: { a: number; b: number }[] | null;
};

// Jogos do jogador (próximos + disputados) com adversário, campo, hora e resultado.
export async function getMyGames(userId: number): Promise<{ upcoming: MyGame[]; played: MyGame[] }> {
  const me = await myPlayerAndTeams(userId);
  if (!me) return { upcoming: [], played: [] };

  const matches = await prisma.match.findMany({
    where: { sides: { some: { OR: [{ teamId: { in: me.teamIds } }, { players: { some: { playerId: me.player.id } } }] } } },
    include: {
      result: true,
      court: { select: { name: true } },
      group: { select: { name: true } },
      stage: { select: { name: true, type: true, category: { select: { name: true, competition: { select: { name: true } } } } } },
      sides: { include: { team: { include: { player1: true, player2: true } }, players: { include: { player: true } } } },
    },
    orderBy: [{ scheduledAt: "asc" }],
  });

  type Side = (typeof matches)[number]["sides"][number];
  const sideName = (s: Side | undefined) => {
    if (!s) return "—";
    if (s.team) return s.team.player2 ? `${s.team.player1.name} / ${s.team.player2.name}` : s.team.player1.name;
    const ps = s.players.map((p) => p.player.name).join(" / ");
    return ps || s.label || "—";
  };

  const games: MyGame[] = matches.map((m) => {
    const mine = m.sides.find((s) => (s.teamId != null && me.teamIds.includes(s.teamId)) || s.players.some((p) => p.playerId === me.player.id));
    const opp = m.sides.find((s) => s.id !== mine?.id);
    const score = (m.result?.score ?? null) as { sets?: { a: number; b: number }[] } | null;
    const won = m.result && mine ? m.result.winnerSide === mine.side : null;
    return {
      id: m.id,
      competition: m.stage.category.competition.name,
      category: m.stage.category.name,
      section: m.stage.type === "GROUPS" ? m.group?.name ?? "Fase de grupos" : m.stage.name,
      mine: sideName(mine),
      opponent: opp ? sideName(opp) : "Por definir",
      when: m.scheduledAt,
      court: m.court?.name ?? null,
      done: m.status === "DONE",
      won,
      sets: score?.sets ?? null,
    };
  });

  return {
    upcoming: games.filter((g) => !g.done),
    played: games.filter((g) => g.done).reverse(),
  };
}

export type MyPayment = {
  id: number;
  entryId: number | null;
  competition: string;
  category: string;
  amount: number;
  status: string;
  method: string;
  reference: string | null;
  entityId: string | null;
  full: boolean;
  referenceEnabled: boolean;
  expressEnabled: boolean;
  transferEnabled: boolean;
  iban: string | null;
  ibanName: string | null;
  reservedUntil: string | null;
  placeholder: boolean; // pagamento inicial ainda sem método escolhido (não mostrar "Referência")
};

// Pagamentos das inscrições do jogador (pagos e pendentes), com indicação se a categoria já está cheia.
export async function getMyPayments(userId: number): Promise<MyPayment[]> {
  const me = await myPlayerAndTeams(userId);
  if (!me) return [];
  const payments = await prisma.payment.findMany({
    where: { entry: { OR: [{ playerId: me.player.id }, { teamId: { in: me.teamIds } }] } },
    orderBy: { createdAt: "desc" },
    include: {
      competition: { select: { name: true } },
      club: { select: { proxypayEntityId: true, referenceEnabled: true, expressEnabled: true, transferEnabled: true, iban: true, ibanName: true } },
      entry: { include: { category: { select: { id: true, name: true, maxEntries: true, competition: { select: { paymentHoldHours: true, paymentHoldCancel: true } } } } } },
    },
  });

  const catIds = [...new Set(payments.map((p) => p.entry?.category.id).filter((x): x is number => x != null))];
  const confirmed = new Map<number, number>();
  for (const cid of catIds) confirmed.set(cid, await prisma.entry.count({ where: { categoryId: cid, status: "CONFIRMED" } }));

  return payments.map((p) => {
    const cat = p.entry?.category;
    const max = cat?.maxEntries ?? null;
    const conf = cat ? confirmed.get(cat.id) ?? 0 : 0;
    const holdH = cat?.competition?.paymentHoldHours ?? null;
    const reservedUntil = holdH && p.status !== "PAID" && p.entry?.createdAt ? new Date(p.entry.createdAt.getTime() + holdH * 3600000).toISOString() : null;
    return {
      id: p.id,
      entryId: p.entryId,
      competition: p.competition?.name ?? "—",
      category: cat?.name ?? "—",
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      reference: p.reference,
      entityId: p.club.proxypayEntityId,
      full: p.status !== "PAID" && max != null && conf >= max,
      referenceEnabled: p.club.referenceEnabled,
      expressEnabled: p.club.expressEnabled,
      transferEnabled: p.club.transferEnabled,
      iban: p.club.iban,
      ibanName: p.club.ibanName,
      reservedUntil,
      placeholder: p.status !== "PAID" && p.method === "REFERENCE" && !p.reference && !p.externalId && !p.proofUrl,
    };
  });
}
