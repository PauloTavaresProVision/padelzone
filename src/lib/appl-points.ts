// Tabela de pontos do ranking oficial APPL (igual ao PadelTeams).
// Pontos = base (Vencedor, Nível 1) por CLASSE × multiplicador da RONDA atingida
// ÷ 2,5 por cada NÍVEL abaixo (N1..N4). Centralizado aqui para afinar num só sítio.

const BASE: Record<string, number> = { "10000": 10000, "5000": 5000, "2000": 2000 };

const ROUND_MULT = {
  VENCEDOR: 1, // venceu a final
  FINALISTA: 0.75, // perdeu a final
  MEIAS: 0.6,
  QUARTOS: 0.4,
  OITAVOS: 0.2,
  R16: 0.1, // 1/16
  R32: 0.05, // 1/32
} as const;

export type RoundKey = keyof typeof ROUND_MULT;

// Tipo de prova -> classe de pontuação (A=5.000, B=10.000, C=2.000 no PadelTeams).
export function applClass(applType: string | null | undefined): keyof typeof BASE | null {
  switch (applType) {
    case "OPEN_2000": return "2000";
    case "OPEN_5000": return "5000";
    case "OPEN_10000":
    case "CAMPEONATO":
    case "MASTERS":
    case "LIGA":
      return "10000";
    default: return null;
  }
}

// Nome da categoria (M1, F3, ...) -> nível 1..4.
export function applLevel(catName: string): number {
  const m = catName.match(/(\d)/);
  const n = m ? Number(m[1]) : 4;
  return Math.min(4, Math.max(1, n));
}

// Colocação a partir da ronda (contada a partir da final) e se venceu essa ronda.
export function placementForRound(fromEnd: number, wonFinal: boolean): RoundKey {
  if (fromEnd <= 0) return wonFinal ? "VENCEDOR" : "FINALISTA";
  if (fromEnd === 1) return "MEIAS";
  if (fromEnd === 2) return "QUARTOS";
  if (fromEnd === 3) return "OITAVOS";
  if (fromEnd === 4) return "R16";
  return "R32";
}

export function applPoints(cls: keyof typeof BASE, level: number, round: RoundKey): number {
  return Math.round((BASE[cls] * ROUND_MULT[round]) / Math.pow(2.5, Math.max(0, level - 1)));
}
