import { describe, it, expect } from "vitest";
import { roundRobin } from "./roundRobin";

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("roundRobin (método do círculo)", () => {
  it("4 equipas: 3 rondas x 2 jogos, cada par exatamente 1 vez", () => {
    const r = roundRobin(["A", "B", "C", "D"]);
    expect(r).toHaveLength(3);
    r.forEach((round) => expect(round).toHaveLength(2));
    const pairs = r.flat().map(([a, b]) => pairKey(a, b));
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs).size).toBe(6);
  });

  it("5 equipas (ímpar): 5 rondas, 10 jogos, cada par 1 vez, 4 jogos por equipa", () => {
    const teams = ["A", "B", "C", "D", "E"];
    const r = roundRobin(teams);
    expect(r).toHaveLength(5);
    const flat = r.flat();
    expect(flat).toHaveLength(10);
    expect(new Set(flat.map(([a, b]) => pairKey(a, b))).size).toBe(10);
    for (const t of teams) {
      const games = flat.filter(([a, b]) => a === t || b === t).length;
      expect(games).toBe(4);
    }
  });

  it("ninguém joga duas vezes na mesma ronda", () => {
    const r = roundRobin(["A", "B", "C", "D", "E", "F"]);
    for (const round of r) {
      const seen = new Set<string>();
      for (const [a, b] of round) {
        expect(seen.has(a)).toBe(false);
        expect(seen.has(b)).toBe(false);
        seen.add(a);
        seen.add(b);
      }
    }
  });
});
