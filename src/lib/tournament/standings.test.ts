import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";

describe("computeStandings", () => {
  it("ordena por pontos e classifica 1..4", () => {
    const ids = [1, 2, 3, 4];
    const results = [
      { homeId: 1, awayId: 2, homeSets: 2, awaySets: 0, homeGames: 12, awayGames: 6 },
      { homeId: 1, awayId: 3, homeSets: 2, awaySets: 1, homeGames: 15, awayGames: 13 },
      { homeId: 1, awayId: 4, homeSets: 2, awaySets: 0, homeGames: 12, awayGames: 7 },
      { homeId: 2, awayId: 3, homeSets: 2, awaySets: 0, homeGames: 12, awayGames: 8 },
      { homeId: 2, awayId: 4, homeSets: 2, awaySets: 1, homeGames: 14, awayGames: 12 },
      { homeId: 3, awayId: 4, homeSets: 2, awaySets: 0, homeGames: 12, awayGames: 9 },
    ];
    const table = computeStandings(ids, results);
    expect(table.map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(table[0]).toMatchObject({ rank: 1, won: 3, points: 6 });
    expect(table[3]).toMatchObject({ rank: 4, won: 0, points: 0 });
  });

  it("desempata por diferença de sets quando os pontos empatam", () => {
    const ids = [1, 2, 3];
    const results = [
      { homeId: 1, awayId: 2, homeSets: 2, awaySets: 0, homeGames: 12, awayGames: 6 },
      { homeId: 1, awayId: 3, homeSets: 0, awaySets: 2, homeGames: 9, awayGames: 12 },
      { homeId: 2, awayId: 3, homeSets: 2, awaySets: 1, homeGames: 16, awayGames: 14 },
    ];
    const table = computeStandings(ids, results);
    expect(table.every((r) => r.points === 2)).toBe(true);
    expect(table.map((r) => r.id)).toEqual([3, 1, 2]);
  });
});
