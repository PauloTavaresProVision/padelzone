// Classificação (tabela de grupo / liga) a partir dos resultados.
// Ordena por: pontos -> diferença de sets -> diferença de jogos.
// (Confronto direto como 1.º critério fica como melhoria futura.)

export interface MatchOutcome {
  homeId: number;
  awayId: number;
  homeSets: number;
  awaySets: number;
  homeGames: number;
  awayGames: number;
}

export interface StandingRow {
  id: number;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number;
  rank: number;
}

export function computeStandings(
  entryIds: number[],
  results: MatchOutcome[],
  opts: { winPoints?: number; lossPoints?: number } = {}
): StandingRow[] {
  const winPoints = opts.winPoints ?? 2;
  const lossPoints = opts.lossPoints ?? 0;

  const table = new Map<number, StandingRow>();
  for (const id of entryIds) {
    table.set(id, {
      id,
      played: 0,
      won: 0,
      lost: 0,
      setsFor: 0,
      setsAgainst: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      points: 0,
      rank: 0,
    });
  }

  for (const r of results) {
    const home = table.get(r.homeId);
    const away = table.get(r.awayId);
    if (!home || !away) throw new Error("resultado refere uma equipa fora do grupo");

    home.played++;
    away.played++;
    home.setsFor += r.homeSets;
    home.setsAgainst += r.awaySets;
    away.setsFor += r.awaySets;
    away.setsAgainst += r.homeSets;
    home.gamesFor += r.homeGames;
    home.gamesAgainst += r.awayGames;
    away.gamesFor += r.awayGames;
    away.gamesAgainst += r.homeGames;

    if (r.homeSets > r.awaySets) {
      home.won++;
      home.points += winPoints;
      away.lost++;
      away.points += lossPoints;
    } else {
      away.won++;
      away.points += winPoints;
      home.lost++;
      home.points += lossPoints;
    }
  }

  const setDiff = (r: StandingRow) => r.setsFor - r.setsAgainst;
  const gameDiff = (r: StandingRow) => r.gamesFor - r.gamesAgainst;

  const rows = [...table.values()].sort(
    (x, y) => y.points - x.points || setDiff(y) - setDiff(x) || gameDiff(y) - gameDiff(x)
  );
  rows.forEach((row, i) => (row.rank = i + 1));
  return rows;
}
