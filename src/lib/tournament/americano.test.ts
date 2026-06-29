import { describe, it, expect } from "vitest";
import { americano4 } from "./americano";

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("americano4", () => {
  it("3 rondas e cada jogador faz par com cada outro exatamente 1 vez", () => {
    const rounds = americano4(["A", "B", "C", "D"]);
    expect(rounds).toHaveLength(3);
    const partners = rounds.flatMap((r) =>
      [r.teamA, r.teamB].map(([x, y]) => pairKey(x, y))
    );
    expect(partners).toHaveLength(6);
    expect(new Set(partners).size).toBe(6); // todas as 6 parcerias distintas
  });
});
