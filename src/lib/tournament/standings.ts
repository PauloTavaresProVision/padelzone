// Classificação (tabela de grupo / liga) a partir dos resultados.
// Ordena por confrontos ganhos vs jogados (vitórias ÷ jogos) e, entre equipas empatadas,
// desempata por: confronto direto -> diferença de sets -> diferença de jogos -> sorteio.

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
  // Confrontos ganhos vs jogados (vitórias ÷ jogos jogados).
  const winRatio = (r: StandingRow) => (r.played > 0 ? r.won / r.played : 0);

  // Confronto direto: vitórias de uma equipa sobre as OUTRAS equipas empatadas com ela.
  const beat = new Map<number, Map<number, number>>();
  for (const r of results) {
    const win = r.homeSets > r.awaySets ? r.homeId : r.awayId;
    const lose = r.homeSets > r.awaySets ? r.awayId : r.homeId;
    const mm = beat.get(win) ?? new Map<number, number>();
    mm.set(lose, (mm.get(lose) ?? 0) + 1);
    beat.set(win, mm);
  }
  const headToHead = (id: number, group: number[]) =>
    group.reduce((acc, other) => acc + (other === id ? 0 : beat.get(id)?.get(other) ?? 0), 0);

  // Ordena por confrontos ganhos e, dentro de cada empate, aplica o desempate do regulamento:
  // confronto direto -> diferença de sets -> diferença de jogos (e por fim sorteio, deixado estável).
  const rows = [...table.values()].sort((x, y) => winRatio(y) - winRatio(x));
  const out: StandingRow[] = [];
  for (let i = 0; i < rows.length; ) {
    let j = i;
    while (j < rows.length && winRatio(rows[j]) === winRatio(rows[i])) j++;
    const group = rows.slice(i, j);
    if (group.length > 1) {
      const ids = group.map((g) => g.id);
      group.sort(
        (a, b) => headToHead(b.id, ids) - headToHead(a.id, ids) || setDiff(b) - setDiff(a) || gameDiff(b) - gameDiff(a),
      );
    }
    out.push(...group);
    i = j;
  }
  out.forEach((row, i) => (row.rank = i + 1));
  return out;
}
