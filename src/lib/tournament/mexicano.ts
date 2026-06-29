// Mexicano (dinâmico) — a próxima ronda é gerada a partir da classificação atual.
// Ordena por pontos, agrupa em blocos de 4 (por campo) e cruza os níveis:
// 1+4 vs 2+3 (ou 1+3 vs 2+4). Jogadores a mais (resto < 4) sentam-se esta ronda.

export interface MexicanoMatch<T> {
  court: number;
  teamA: [T, T];
  teamB: [T, T];
}

export function mexicanoRound<T>(
  ranking: readonly T[],
  pairing: "1-4" | "1-3" = "1-4"
): MexicanoMatch<T>[] {
  const matches: MexicanoMatch<T>[] = [];
  let court = 1;

  for (let i = 0; i + 4 <= ranking.length; i += 4) {
    const [p1, p2, p3, p4] = ranking.slice(i, i + 4);
    matches.push(
      pairing === "1-4"
        ? { court, teamA: [p1, p4], teamB: [p2, p3] }
        : { court, teamA: [p1, p3], teamB: [p2, p4] }
    );
    court++;
  }

  return matches;
}
