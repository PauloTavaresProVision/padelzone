// Ordena categorias por código: primeiro Masculino (M1, M2, M3, M4...), depois
// Feminino (F1, F2, F3...), depois outras; dentro de cada, por número crescente.

export function categorySortKey(name: string): [number, number, string] {
  const m = name.trim().toUpperCase().match(/^([A-Z]+)\s*0*(\d+)?/);
  const letters = m?.[1] ?? name.trim().toUpperCase();
  const num = m?.[2] ? parseInt(m[2], 10) : 9999;
  const rank = letters[0] === "M" ? 0 : letters[0] === "F" ? 1 : 2;
  return [rank, num, letters];
}

export function sortCategories<T extends { name: string }>(cats: readonly T[]): T[] {
  return [...cats].sort((a, b) => {
    const ka = categorySortKey(a.name);
    const kb = categorySortKey(b.name);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
  });
}
