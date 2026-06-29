// Americano (social, pontos individuais) — cada jogador faz par com todos os outros.
// americano4 é o bloco canónico de 4 jogadores: 3 rondas em que cada um é parceiro
// de cada outro exatamente 1 vez. (O Americano de N jogadores em vários campos usa
// tabelas de rotação — fica como passo seguinte, ver docs/tournament-engine.md.)

export interface AmericanoMatch<T> {
  round: number;
  teamA: [T, T];
  teamB: [T, T];
}

export function americano4<T>(players: readonly [T, T, T, T]): AmericanoMatch<T>[] {
  const [a, b, c, d] = players;
  return [
    { round: 1, teamA: [a, b], teamB: [c, d] },
    { round: 2, teamA: [a, c], teamB: [b, d] },
    { round: 3, teamA: [a, d], teamB: [b, c] },
  ];
}
