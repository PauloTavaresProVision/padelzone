import { prisma } from "@/lib/prisma";
import { buildKnockout, seedOrder } from "@/lib/tournament/knockout";
import { snakeSeed } from "@/lib/tournament/groups";
import { roundRobin } from "@/lib/tournament/roundRobin";

type EntryLite = { id: number; teamId: number | null; playerId: number | null; seed: number | null };

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// O SORTEIO em si: cabeças de série (se useSeeds) primeiro por seed; os restantes BARALHADOS à sorte.
async function drawnEntries(categoryId: number, useSeeds: boolean): Promise<EntryLite[]> {
  const raw = await prisma.entry.findMany({
    where: { categoryId, status: "CONFIRMED" },
    select: {
      id: true, teamId: true, playerId: true, seed: true,
      team: { select: { player1: { select: { invitePending: true } }, player2: { select: { invitePending: true } } } },
      player: { select: { invitePending: true } },
    },
  });
  // Trava: a dupla só entra no sorteio quando nenhum parceiro CONVIDADO está por registar.
  const blocked = (e: (typeof raw)[number]) =>
    !!(e.team?.player1?.invitePending || e.team?.player2?.invitePending || e.player?.invitePending);
  const entries: EntryLite[] = raw
    .filter((e) => !blocked(e))
    .map((e) => ({ id: e.id, teamId: e.teamId, playerId: e.playerId, seed: e.seed }));
  if (!useSeeds) return shuffle(entries);
  const seeded = entries.filter((e) => e.seed != null).sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  const rest = shuffle(entries.filter((e) => e.seed == null));
  return [...seeded, ...rest];
}

export async function clearStages(categoryId: number) {
  await prisma.stage.deleteMany({ where: { categoryId } }); // cascata: matches/groups/standings
}

async function makeSide(matchId: number, side: "A" | "B", entry: EntryLite) {
  await prisma.matchSide.create({
    data: {
      matchId,
      side,
      teamId: entry.teamId ?? undefined,
      players: entry.playerId ? { create: { playerId: entry.playerId } } : undefined,
    },
  });
}

// Cria um Stage KNOCKOUT a partir de uma lista JÁ ORDENADA (índice 0 = cabeça de série 1).
async function buildKnockoutStage(categoryId: number, order: number, name: string, entries: EntryLite[]) {
  const stage = await prisma.stage.create({
    data: { categoryId, order, name, type: "KNOCKOUT", config: {} },
  });

  const built = buildKnockout(entries);
  const numberMap = new Map<number, number>();
  built.matches.forEach((m, i) => numberMap.set(m.id, i + 1));
  const idMap = new Map<number, number>();

  for (const m of built.matches) {
    const dbm = await prisma.match.create({
      data: { stageId: stage.id, round: m.round, slotInRound: m.position, status: "PENDING" },
    });
    idMap.set(m.id, dbm.id);

    for (const [side, slot] of [["A", m.a], ["B", m.b]] as const) {
      if (slot.kind === "entry") {
        await makeSide(dbm.id, side, slot.entry);
      } else if (slot.kind === "bye") {
        await prisma.matchSide.create({ data: { matchId: dbm.id, side, label: "Isento" } });
      } else {
        await prisma.matchSide.create({
          data: { matchId: dbm.id, side, label: `Vencedor J${numberMap.get(slot.from)}` },
        });
      }
    }
  }

  for (const m of built.matches) {
    if (m.nextMatchId != null) {
      await prisma.match.update({
        where: { id: idMap.get(m.id)! },
        data: { nextMatchId: idMap.get(m.nextMatchId)! },
      });
    }
  }
  return stage.id;
}

export async function persistKnockout(categoryId: number, useSeeds = true) {
  const entries = await drawnEntries(categoryId, useSeeds);
  if (entries.length < 2) throw new Error("São precisas pelo menos 2 inscrições confirmadas.");
  await clearStages(categoryId);
  return buildKnockoutStage(categoryId, 0, "Quadro", entries);
}

export async function persistGroups(categoryId: number, numGroups: number, useSeeds = true) {
  const entries = await drawnEntries(categoryId, useSeeds);
  if (entries.length < 2) throw new Error("São precisas pelo menos 2 inscrições confirmadas.");

  const n = Math.max(1, Math.min(numGroups || 1, Math.floor(entries.length / 2) || 1));
  await clearStages(categoryId);
  const stage = await prisma.stage.create({
    data: { categoryId, order: 0, name: "Fase de grupos", type: "GROUPS", config: { numGroups: n } },
  });

  const groups = snakeSeed(entries, n);
  for (let gi = 0; gi < groups.length; gi++) {
    const groupEntries = groups[gi];
    if (groupEntries.length === 0) continue;

    const group = await prisma.group.create({
      data: { stageId: stage.id, name: `Grupo ${String.fromCharCode(65 + gi)}` },
    });
    for (const e of groupEntries) {
      await prisma.groupEntry.create({ data: { groupId: group.id, entryId: e.id } });
      await prisma.standing.create({ data: { stageId: stage.id, groupId: group.id, entryId: e.id } });
    }

    const rounds = roundRobin(groupEntries);
    for (let r = 0; r < rounds.length; r++) {
      let pos = 0;
      for (const [a, b] of rounds[r]) {
        pos++;
        const m = await prisma.match.create({
          data: { stageId: stage.id, groupId: group.id, round: r + 1, slotInRound: pos, status: "PENDING" },
        });
        await makeSide(m.id, "A", a);
        await makeSide(m.id, "B", b);
      }
    }
  }
  return stage.id;
}

// 2.ª fase: quadro de apuramento a partir das classificações dos grupos (após os jogos de grupos).
export async function persistQualifiersBracket(categoryId: number, qualifiersPerGroup: number) {
  const gs = await prisma.stage.findFirst({
    where: { categoryId, type: "GROUPS" },
    orderBy: { order: "asc" },
    include: { standings: { include: { entry: { select: { id: true, teamId: true, playerId: true } } } } },
  });
  if (!gs) throw new Error("Ainda não há fase de grupos para apurar.");

  const pending = await prisma.match.count({ where: { stageId: gs.id, status: { not: "DONE" } } });
  if (pending > 0) throw new Error("Ainda há jogos da fase de grupos por concluir.");

  const k = Math.max(1, qualifiersPerGroup || 1);
  const byRank: EntryLite[][] = [];
  for (const st of gs.standings) {
    if (st.rank >= 1 && st.rank <= k) {
      (byRank[st.rank - 1] ??= []).push({
        id: st.entry.id,
        teamId: st.entry.teamId,
        playerId: st.entry.playerId,
        seed: null,
      });
    }
  }
  const qualifiers = byRank.flat(); // vencedores de grupo primeiro, depois 2.os, etc.
  if (qualifiers.length < 2) throw new Error("Apuramento insuficiente. Confirma as classificações dos grupos.");

  await prisma.stage.deleteMany({ where: { categoryId, type: "KNOCKOUT" } });
  return buildKnockoutStage(categoryId, 1, "Quadro final", qualifiers);
}

// Cria o ESQUELETO do quadro de eliminatórias (placeholders) — para reservar já os slots no calendário,
// antes de se saber quem apura. As rondas vão diminuindo (1/8 -> 1/4 -> meias -> final).
export async function persistKnockoutSkeleton(categoryId: number, qualifiers: number, order: number, name: string) {
  const q = Math.max(2, qualifiers);
  const placeholders = Array.from({ length: q }, (_, i) => ({ label: `Apurado ${i + 1}` }));
  const stage = await prisma.stage.create({
    data: { categoryId, order, name, type: "KNOCKOUT", config: { skeleton: true, qualifiers: q } },
  });

  const built = buildKnockout(placeholders);
  const numberMap = new Map<number, number>();
  built.matches.forEach((m, i) => numberMap.set(m.id, i + 1));
  const idMap = new Map<number, number>();

  for (const m of built.matches) {
    const dbm = await prisma.match.create({
      data: { stageId: stage.id, round: m.round, slotInRound: m.position, status: "PENDING" },
    });
    idMap.set(m.id, dbm.id);
    for (const [side, slot] of [["A", m.a], ["B", m.b]] as const) {
      let label = "Isento";
      if (slot.kind === "entry") label = (slot.entry as { label: string }).label;
      else if (slot.kind === "winner") label = `Vencedor J${numberMap.get(slot.from)}`;
      await prisma.matchSide.create({ data: { matchId: dbm.id, side, label } });
    }
  }
  for (const m of built.matches) {
    if (m.nextMatchId != null) {
      await prisma.match.update({ where: { id: idMap.get(m.id)! }, data: { nextMatchId: idMap.get(m.nextMatchId)! } });
    }
  }
  return stage.id;
}

type SeededItem = { e: EntryLite; group: number | null; rank: number };

// Semeia o quadro afastando duplas do mesmo grupo (sem revanche na 1ª ronda; o 2º de um grupo
// vai para a metade oposta à do 1º desse grupo). Só quando o quadro fica cheio (nº de apurados =
// potência de 2); com isentos mantém a ordem por ranking (o construtor coloca os isentos certos).
export function seedEntrants(chosen: SeededItem[], n: number): EntryLite[] {
  const pow2 = n >= 2 && (n & (n - 1)) === 0;
  if (!pow2) return chosen.map((x) => x.e);

  const order = seedOrder(n); // seed (1-based) em cada slot
  const slotOfSeed: number[] = [];
  order.forEach((seed, slot) => (slotOfSeed[seed - 1] = slot));
  const placed: (SeededItem | null)[] = Array(n).fill(null);

  // Os vencedores de grupo ficam nas cabeças de série padrão (já ficam afastados entre si).
  const winners = chosen.filter((x) => x.rank === 1);
  const rest = chosen.filter((x) => x.rank !== 1);
  winners.forEach((x, i) => { if (i < n) placed[slotOfSeed[i]] = x; });

  // Penaliza colocar uma dupla perto de outra do mesmo grupo: 1ª ronda >> mesmo quarto > mesma metade.
  const conflict = (x: SeededItem, slot: number) => {
    if (x.group == null) return 0;
    let s = 0;
    const sib = placed[slot ^ 1];
    if (sib && sib.group === x.group) s += 100;
    const q = n / 4;
    if (q >= 1) { const qs = Math.floor(slot / q) * q; for (let k = qs; k < qs + q; k++) { const p = placed[k]; if (p && p.group === x.group) s += 10; } }
    const h = n / 2; const hs = slot < h ? 0 : h;
    for (let k = hs; k < hs + h; k++) { const p = placed[k]; if (p && p.group === x.group) s += 1; }
    return s;
  };

  for (const x of rest) {
    let bestSlot = -1, bestScore = Infinity;
    for (let j = 0; j < n; j++) {
      if (placed[j]) continue;
      const score = conflict(x, j) * 1000 + order[j]; // entre slots iguais, prefere a melhor cabeça de série
      if (score < bestScore) { bestScore = score; bestSlot = j; }
    }
    placed[bestSlot] = x;
  }

  // GARANTIA: nenhum confronto da 1ª ronda (1/8) é do mesmo grupo. Troca duplas
  // entre jogos (sem mexer nos 1ºs, que ficam no topo a jogar com os 3ºs) até
  // não haver conflito. Tenta primeiro trocar entre o mesmo ranking (preserva
  // 1ºs vs 3ºs); se não chegar, troca qualquer dupla que não seja cabeça de série.
  const sameGroupR1 = (slot: number) => {
    const x = placed[slot], y = placed[slot ^ 1];
    return !!(x && y && x.group != null && x.group === y.group);
  };
  const repair = (sameRankOnly: boolean, moveWinners: boolean) => {
    for (let pass = 0; pass < 4 * n; pass++) {
      let bad = -1;
      for (let s = 0; s < n; s++) if (sameGroupR1(s)) { bad = s; break; }
      if (bad < 0) return true;
      if (!moveWinners && placed[bad]!.rank === 1 && placed[bad ^ 1]!.rank !== 1) bad = bad ^ 1; // mover o não-cabeça
      const x = placed[bad]!;
      let done = false;
      for (let j = 0; j < n && !done; j++) {
        const y = placed[j];
        if (!y || j === bad || j === (bad ^ 1)) continue;
        if (!moveWinners && (x.rank === 1 || y.rank === 1)) continue;
        if (sameRankOnly && y.rank !== x.rank) continue;
        const xOpp = placed[j ^ 1], yOpp = placed[bad ^ 1];
        const okX = !xOpp || xOpp.group == null || xOpp.group !== x.group;
        const okY = !yOpp || yOpp.group == null || yOpp.group !== y.group;
        if (okX && okY) { placed[bad] = y; placed[j] = x; done = true; }
      }
      if (!done) return false;
    }
    return true;
  };
  // 1) troca entre o mesmo ranking (mantém 1ºs vs 3ºs); 2) qualquer não-cabeça;
  // 3) último recurso: troca cabeças de série (a separação por grupo é prioritária).
  if (!repair(true, false) && !repair(false, false)) repair(false, true);

  const entrants: EntryLite[] = new Array(n);
  for (let j = 0; j < n; j++) entrants[order[j] - 1] = placed[j]!.e;
  return entrants;
}

// Apuramento FLEXÍVEL: ranking cruzado entre grupos (todos os 1ºs, depois os 2ºs, depois os
// MELHORES 3ºs, 4ºs…) e o organizador escolhe quantas duplas apuram (tamanho do quadro).
// Reconstrói o quadro a partir das classificações reais — pode ser refeito depois dos grupos.
export async function persistQualifiersFlexible(categoryId: number, size: number) {
  const gs = await prisma.stage.findFirst({
    where: { categoryId, type: "GROUPS" },
    orderBy: { order: "asc" },
    include: { standings: { include: { entry: { select: { id: true, teamId: true, playerId: true } } } } },
  });
  if (!gs) throw new Error("Ainda não há fase de grupos para apurar.");
  const pending = await prisma.match.count({ where: { stageId: gs.id, status: { not: "DONE" } } });
  if (pending > 0) throw new Error("Ainda há jogos da fase de grupos por concluir.");

  // Ordena por posição no grupo e, dentro da mesma posição, pelos critérios de desempate
  // (confrontos ganhos vs jogados, diferença de jogos, diferença de sets) — comparação entre grupos.
  const ranked = [...gs.standings].sort(
    (a, b) =>
      a.rank - b.rank ||
      (b.played ? b.won / b.played : 0) - (a.played ? a.won / a.played : 0) ||
      (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst) ||
      (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst),
  );
  const pool: SeededItem[] = ranked.map((st) => ({
    e: { id: st.entry.id, teamId: st.entry.teamId, playerId: st.entry.playerId, seed: null },
    group: st.groupId,
    rank: st.rank,
  }));
  const n = Math.max(2, Math.min(size || pool.length, pool.length));
  if (n < 2) throw new Error("Apuramento insuficiente. Confirma as classificações dos grupos.");
  const entrants = seedEntrants(pool.slice(0, n), n);

  await prisma.stage.deleteMany({ where: { categoryId, type: "KNOCKOUT" } });
  return buildKnockoutStage(categoryId, 1, "Quadro final", entrants);
}

// Preenche o esqueleto com os apurados reais (depois dos grupos concluídos).
export async function fillQualifiers(categoryId: number, qualifiersPerGroup: number) {
  const gs = await prisma.stage.findFirst({
    where: { categoryId, type: "GROUPS" },
    orderBy: { order: "asc" },
    include: { standings: { include: { entry: { select: { id: true, teamId: true, playerId: true } } } } },
  });
  if (!gs) throw new Error("Ainda não há fase de grupos para apurar.");
  const pending = await prisma.match.count({ where: { stageId: gs.id, status: { not: "DONE" } } });
  if (pending > 0) throw new Error("Ainda há jogos da fase de grupos por concluir.");

  const ko = await prisma.stage.findFirst({ where: { categoryId, type: "KNOCKOUT" }, orderBy: { order: "asc" } });
  if (!ko) return persistQualifiersBracket(categoryId, qualifiersPerGroup); // fallback: sem esqueleto

  const k = Math.max(1, qualifiersPerGroup);
  const byRank: { id: number; teamId: number | null; playerId: number | null }[][] = [];
  for (const st of gs.standings) {
    if (st.rank >= 1 && st.rank <= k) {
      (byRank[st.rank - 1] ??= []).push({ id: st.entry.id, teamId: st.entry.teamId, playerId: st.entry.playerId });
    }
  }
  const qualifiers = byRank.flat();

  const r0 = await prisma.match.findMany({ where: { stageId: ko.id, round: 0 }, include: { sides: true } });
  for (const m of r0) {
    for (const s of m.sides) {
      const mt = s.label?.match(/^Apurado (\d+)$/);
      if (!mt) continue;
      const q = qualifiers[Number(mt[1]) - 1];
      if (!q) continue;
      if (q.teamId) {
        await prisma.matchSide.update({ where: { id: s.id }, data: { teamId: q.teamId, label: null } });
      } else if (q.playerId) {
        await prisma.matchSide.update({ where: { id: s.id }, data: { label: null, players: { create: { playerId: q.playerId } } } });
      }
    }
  }
  return ko.id;
}
