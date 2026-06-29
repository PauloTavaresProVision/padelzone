import { describe, it, expect } from "vitest";
import { mexicanoRound } from "./mexicano";

describe("mexicanoRound", () => {
  it("8 jogadores: 2 campos, emparelhamento 1+4 vs 2+3", () => {
    const rank = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    const m = mexicanoRound(rank);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ court: 1, teamA: ["p1", "p4"], teamB: ["p2", "p3"] });
    expect(m[1]).toMatchObject({ court: 2, teamA: ["p5", "p8"], teamB: ["p6", "p7"] });
  });

  it("variante 1+3 vs 2+4", () => {
    const m = mexicanoRound(["p1", "p2", "p3", "p4"], "1-3");
    expect(m[0]).toMatchObject({ teamA: ["p1", "p3"], teamB: ["p2", "p4"] });
  });

  it("6 jogadores: só 1 campo completo (2 sentam-se)", () => {
    expect(mexicanoRound(["p1", "p2", "p3", "p4", "p5", "p6"])).toHaveLength(1);
  });
});
