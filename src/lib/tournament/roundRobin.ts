// Round-robin (fase de grupos / liga) — método do círculo.
// Gera rondas equilibradas: cada equipa joga 1x por ronda, e cada par exatamente 1 vez.
// Com nº ímpar, adiciona um "bye" (folga) que roda entre as equipas.

export function roundRobin<T>(teams: readonly T[]): [T, T][][] {
  const arr: (T | null)[] = [...teams];
  if (arr.length % 2 === 1) arr.push(null); // bye
  const n = arr.length;
  const rounds: [T, T][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const round: [T, T][] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== null && away !== null) round.push([home, away]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()!); // roda mantendo arr[0] fixo
  }

  return rounds;
}
