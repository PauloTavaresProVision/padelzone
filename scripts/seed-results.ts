/**
 * Preenche resultados VARIADOS na fase de grupos de todas as categorias de uma
 * competicao, para depois se poder gerar o quadro de apuramento (1/8) no browser.
 * Recalcula as classificacoes. NAO gera o quadro de apuramento.
 *
 * Pre-requisito: o sorteio (fase de grupos) ja tem de estar lancado.
 *
 * Uso (no servidor):
 *   docker compose exec app npx tsx scripts/seed-results.ts
 *   docker compose exec app npx tsx scripts/seed-results.ts --comp="STANDARD BANK"
 *   docker compose exec app npx tsx scripts/seed-results.ts --comp=2
 *
 * Por defeito procura a competicao cujo nome contenha "standard bank".
 * Idempotente: os resultados sao deterministicos, podes correr as vezes que quiseres.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const compArg = args.find((a) => a.startsWith("--comp="))?.split("=")[1] ?? "standard bank";

type SetScore = { a: number; b: number };

// "Forca" deterministica por inscricao (0..99), so para gerar resultados plausiveis.
const strength = (id: number) => Math.abs((id * 2654435761) % 100);

// Resultado plausivel conforme a diferenca de forca (inclui alguns super tie-breaks).
// As listas tem o vencedor no lado A; se o mais forte for o B, espelha-se.
function makeScore(strongerIsA: boolean, gap: number): SetScore[] {
  let sets: SetScore[];
  if (gap > 45) sets = [{ a: 6, b: 1 }, { a: 6, b: 2 }];
  else if (gap > 30) sets = [{ a: 6, b: 2 }, { a: 6, b: 4 }];
  else if (gap > 18) sets = [{ a: 6, b: 3 }, { a: 7, b: 5 }];
  else if (gap > 8) sets = [{ a: 6, b: 4 }, { a: 4, b: 6 }, { a: 10, b: 7 }]; // super tie-break
  else sets = [{ a: 4, b: 6 }, { a: 6, b: 4 }, { a: 10, b: 8 }]; // super tie-break renhido
  return strongerIsA ? sets : sets.map((s) => ({ a: s.b, b: s.a }));
}

// Conta jogos tratando o super tie-break (lado >= 8) como set de 1-0.
function tally(sets: SetScore[]) {
  let setsA = 0, setsB = 0, gamesA = 0, gamesB = 0;
  for (const s of sets) {
    const stb = Math.max(s.a, s.b) >= 8;
    gamesA += stb ? (s.a > s.b ? 1 : 0) : s.a;
    gamesB += stb ? (s.b > s.a ? 1 : 0) : s.b;
    if (s.a > s.b) setsA++;
    else if (s.b > s.a) setsB++;
  }
  return { setsA, setsB, gamesA, gamesB };
}

(async () => {
  let comp;
  if (Number.isFinite(Number(compArg)) && Number(compArg) > 0) {
    comp = await prisma.competition.findUnique({ where: { id: Number(compArg) }, include: { categories: true } });
  } else {
    const found = await prisma.competition.findMany({
      where: { name: { contains: compArg, mode: "insensitive" } },
      include: { categories: true },
    });
    if (found.length > 1) {
      console.log("Varias competicoes encontradas. Corre de novo com --comp=<id>:");
      for (const c of found) console.log(`  [${c.id}] ${c.name}`);
      await prisma.$disconnect();
      return;
    }
    comp = found[0] ?? null;
  }
  if (!comp) {
    console.log("Competicao nao encontrada para:", compArg);
    await prisma.$disconnect();
    return;
  }
  console.log(`Competicao: [${comp.id}] ${comp.name}`);

  for (const cat of comp.categories) {
    const gs = await prisma.stage.findFirst({ where: { categoryId: cat.id, type: "GROUPS" } });
    if (!gs) {
      console.log(`  ${cat.name}: sem fase de grupos (salto)`);
      continue;
    }
    const groups = await prisma.group.findMany({ where: { stageId: gs.id } });
    let filled = 0;
    for (const g of groups) {
      const members = await prisma.groupEntry.findMany({ where: { groupId: g.id }, select: { entryId: true } });
      const entryIds = members.map((m) => m.entryId);
      const entries = await prisma.entry.findMany({
        where: { id: { in: entryIds } },
        select: { id: true, teamId: true, playerId: true },
      });
      const teamToEntry = new Map<number, number>(), playerToEntry = new Map<number, number>();
      for (const e of entries) {
        if (e.teamId) teamToEntry.set(e.teamId, e.id);
        if (e.playerId) playerToEntry.set(e.playerId, e.id);
      }
      const entryOf = (s?: { teamId: number | null; players: { playerId: number }[] }) =>
        !s ? undefined : s.teamId ? teamToEntry.get(s.teamId) : s.players[0] ? playerToEntry.get(s.players[0].playerId) : undefined;

      const matches = await prisma.match.findMany({
        where: { groupId: g.id },
        include: { sides: { include: { players: true } } },
      });

      const agg = new Map<number, { played: number; won: number; lost: number; sf: number; sa: number; gf: number; ga: number }>();
      for (const id of entryIds) agg.set(id, { played: 0, won: 0, lost: 0, sf: 0, sa: 0, gf: 0, ga: 0 });

      for (const m of matches) {
        const a = m.sides.find((s) => s.side === "A");
        const b = m.sides.find((s) => s.side === "B");
        const ea = entryOf(a), eb = entryOf(b);
        if (ea == null || eb == null) continue;
        const sA = strength(ea), sB = strength(eb);
        const sets = makeScore(sA >= sB, Math.abs(sA - sB));
        const t = tally(sets);
        const winnerSide = t.setsA > t.setsB ? "A" : "B";
        const score = { sets, setsA: t.setsA, setsB: t.setsB, gamesA: t.gamesA, gamesB: t.gamesB };
        await prisma.matchResult.upsert({
          where: { matchId: m.id },
          update: { winnerSide: winnerSide as never, score },
          create: { matchId: m.id, winnerSide: winnerSide as never, score },
        });
        await prisma.match.update({ where: { id: m.id }, data: { status: "DONE" } });

        const A = agg.get(ea)!, B = agg.get(eb)!;
        A.played++; B.played++;
        A.sf += t.setsA; A.sa += t.setsB; B.sf += t.setsB; B.sa += t.setsA;
        A.gf += t.gamesA; A.ga += t.gamesB; B.gf += t.gamesB; B.ga += t.gamesA;
        if (t.setsA > t.setsB) { A.won++; B.lost++; } else { B.won++; A.lost++; }
        filled++;
      }

      // Classificacao: vitorias/jogos -> diferenca de jogos -> diferenca de sets.
      const rows = [...agg.entries()].map(([id, r]) => ({ id, ...r }));
      rows.sort(
        (x, y) =>
          (y.played ? y.won / y.played : 0) - (x.played ? x.won / x.played : 0) ||
          (y.gf - y.ga) - (x.gf - x.ga) ||
          (y.sf - y.sa) - (x.sf - x.sa),
      );
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        await prisma.standing.updateMany({
          where: { stageId: gs.id, groupId: g.id, entryId: r.id },
          data: { played: r.played, won: r.won, lost: r.lost, setsFor: r.sf, setsAgainst: r.sa, gamesFor: r.gf, gamesAgainst: r.ga, points: r.won * 2, rank: i + 1 },
        });
      }
    }
    console.log(`  ${cat.name}: ${groups.length} grupos, ${filled} jogos preenchidos`);
  }

  console.log("Feito. Agora, no browser, gera o quadro de apuramento (1/8) em cada categoria.");
  await prisma.$disconnect();
})();
