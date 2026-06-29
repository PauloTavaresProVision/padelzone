import { describe, it, expect } from "vitest";
import { snakeSeed } from "./groups";

describe("snakeSeed (sorteio em serpentina)", () => {
  it("8 cabeças de série em 2 grupos: equilibrado e em serpentina", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const g = snakeSeed(seeds, 2);
    expect(g.map((x) => x.length)).toEqual([4, 4]);
    expect(g[0][0]).toBe(1); // seed 1 -> grupo A
    expect(g[1][0]).toBe(2); // seed 2 -> grupo B
    expect(g[1][1]).toBe(3); // serpentina: seed 3 -> grupo B
    expect(g[0][1]).toBe(4); // seed 4 -> grupo A
    expect(g.flat().sort((a, b) => a - b)).toEqual(seeds);
  });

  it("6 inscrições em 4 grupos: tamanhos diferem no máximo 1", () => {
    const g = snakeSeed([1, 2, 3, 4, 5, 6], 4);
    const sizes = g.map((x) => x.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(g.flat()).toHaveLength(6);
  });
});
