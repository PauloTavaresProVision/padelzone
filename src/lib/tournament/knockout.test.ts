import { describe, it, expect } from "vitest";
import { seedOrder, bracketSize, buildKnockout } from "./knockout";

describe("seedOrder", () => {
  it("gera a ordem canónica", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("os opostos da 1.ª ronda somam size+1 e todos os seeds são únicos", () => {
    for (const size of [4, 8, 16, 32]) {
      const o = seedOrder(size);
      expect(new Set(o).size).toBe(size);
      for (let i = 0; i < size; i += 2) expect(o[i] + o[i + 1]).toBe(size + 1);
    }
  });

  it("rejeita tamanhos que não são potência de 2", () => {
    expect(() => seedOrder(6)).toThrow();
  });
});

describe("bracketSize", () => {
  it("arredonda para a próxima potência de 2", () => {
    expect(bracketSize(2)).toBe(2);
    expect(bracketSize(5)).toBe(8);
    expect(bracketSize(8)).toBe(8);
    expect(bracketSize(9)).toBe(16);
  });
});

describe("buildKnockout", () => {
  it("8 equipas: 7 jogos, 3 rondas, 1 final, 0 byes", () => {
    const { size, rounds, matches } = buildKnockout(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(size).toBe(8);
    expect(rounds).toBe(3);
    expect(matches).toHaveLength(7);
    expect(matches.filter((m) => m.nextMatchId === null)).toHaveLength(1);
    const byes = matches.flatMap((m) => [m.a, m.b]).filter((s) => s.kind === "bye");
    expect(byes).toHaveLength(0);
  });

  it("5 equipas: tamanho 8, 3 byes, 7 jogos", () => {
    const { size, matches } = buildKnockout(["A", "B", "C", "D", "E"]);
    expect(size).toBe(8);
    const byes = matches.flatMap((m) => [m.a, m.b]).filter((s) => s.kind === "bye");
    expect(byes).toHaveLength(3);
    expect(matches).toHaveLength(7);
  });

  it("todos os jogos não-finais apontam para um jogo seguinte válido", () => {
    const { matches } = buildKnockout(["A", "B", "C", "D", "E", "F", "G", "H"]);
    const ids = new Set(matches.map((m) => m.id));
    for (const m of matches) {
      if (m.nextMatchId !== null) {
        expect(ids.has(m.nextMatchId)).toBe(true);
        expect(["a", "b"]).toContain(m.nextSlot);
      }
    }
  });
});
