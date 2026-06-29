// Eliminatórias / Quadros — ver docs/tournament-engine.md
// seedOrder + construção da árvore do quadro (com byes e ponteiros de avanço).

export function seedOrder(size: number): number[] {
  if (size < 1 || (size & (size - 1)) !== 0) {
    throw new Error(`o tamanho do quadro tem de ser potência de 2 (recebido: ${size})`);
  }
  let order = [1];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) next.push(seed, sum - seed);
    order = next;
  }
  return order;
}

export function bracketSize(entrantCount: number): number {
  if (entrantCount < 2) throw new Error("são precisas pelo menos 2 inscrições");
  return 1 << Math.ceil(Math.log2(entrantCount));
}

export type KnockoutSlot<T> =
  | { kind: "entry"; entry: T; seed: number }
  | { kind: "bye" }
  | { kind: "winner"; from: number };

export interface KnockoutMatch<T> {
  id: number;
  round: number; // 0 = primeira ronda
  position: number; // índice dentro da ronda
  a: KnockoutSlot<T>;
  b: KnockoutSlot<T>;
  nextMatchId: number | null; // para onde vai o vencedor
  nextSlot: "a" | "b" | null;
}

// `entrants` assume-se ordenado por cabeça de série: entrants[0] = seed 1, etc.
export function buildKnockout<T>(entrants: T[]): {
  size: number;
  rounds: number;
  matches: KnockoutMatch<T>[];
} {
  const n = entrants.length;
  const size = bracketSize(n);
  const order = seedOrder(size);
  const slots: KnockoutSlot<T>[] = order.map((seed) =>
    seed <= n ? { kind: "entry", entry: entrants[seed - 1], seed } : { kind: "bye" }
  );

  const matches: KnockoutMatch<T>[] = [];
  let nextId = 1;
  const totalRounds = Math.log2(size);

  let prevIds: number[] = [];
  for (let i = 0; i < size / 2; i++) {
    const m: KnockoutMatch<T> = {
      id: nextId++,
      round: 0,
      position: i,
      a: slots[i * 2],
      b: slots[i * 2 + 1],
      nextMatchId: null,
      nextSlot: null,
    };
    matches.push(m);
    prevIds.push(m.id);
  }

  for (let r = 1; r < totalRounds; r++) {
    const count = size / 2 ** (r + 1);
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const m: KnockoutMatch<T> = {
        id: nextId++,
        round: r,
        position: i,
        a: { kind: "winner", from: prevIds[i * 2] },
        b: { kind: "winner", from: prevIds[i * 2 + 1] },
        nextMatchId: null,
        nextSlot: null,
      };
      matches.push(m);
      ids.push(m.id);
    }
    for (let i = 0; i < prevIds.length; i++) {
      const prev = matches.find((m) => m.id === prevIds[i])!;
      prev.nextMatchId = ids[Math.floor(i / 2)];
      prev.nextSlot = i % 2 === 0 ? "a" : "b";
    }
    prevIds = ids;
  }

  return { size, rounds: totalRounds, matches };
}
