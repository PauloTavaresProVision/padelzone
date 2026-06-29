// Pontuação de um jogo (sets) e contagem de jogos para a classificação.
// O super tie-break (set decisivo jogado até 10 pontos, ex.: 10-8) conta como
// um set de 1-0 nos jogos, para NÃO distorcer a diferença de jogos (Pg - Ps).
// O ecrã continua a mostrar o resultado real (10-8); só a contagem é normalizada.

export type SetScore = { a: number; b: number };

// Um set com 8 ou mais "jogos" de um dos lados é, na prática, um super tie-break
// (um set normal de padel vai no máximo a 7, com tie-break a fechar 7-6).
const isSuperTieBreak = (s: SetScore) => Math.max(s.a, s.b) >= 8;

export function tallyGames(sets: SetScore[]) {
  let setsA = 0,
    setsB = 0,
    gamesA = 0,
    gamesB = 0;
  for (const s of sets) {
    if (isSuperTieBreak(s)) {
      gamesA += s.a > s.b ? 1 : 0;
      gamesB += s.b > s.a ? 1 : 0;
    } else {
      gamesA += s.a;
      gamesB += s.b;
    }
    if (s.a > s.b) setsA++;
    else if (s.b > s.a) setsB++;
  }
  return { setsA, setsB, gamesA, gamesB };
}
