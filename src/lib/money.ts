// Formatação de Kwanzas (AOA) — milhares com ponto, decimais com vírgula, sufixo "Kz".
// Ex.: 15000 → "15.000,00 Kz". Determinístico (não depende do ICU do ambiente).
export function formatKz(value: number | null | undefined, opts?: { zero?: string; empty?: string }) {
  if (value == null) return opts?.empty ?? "Sem preço";
  if (value === 0) return opts?.zero ?? "Grátis";
  const [int, dec] = Math.abs(value).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "-" : ""}${grouped},${dec} Kz`;
}
