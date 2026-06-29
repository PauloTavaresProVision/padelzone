// Distribuição de inscrições pelos grupos em serpentina (snake seeding).
// As cabeças de série espalham-se: 1->A, 2->B, ..., depois inverte (serpentina),
// para equilibrar a força entre grupos.

export function snakeSeed<T>(entrants: readonly T[], numGroups: number): T[][] {
  if (numGroups < 1) throw new Error("numGroups tem de ser >= 1");
  const groups: T[][] = Array.from({ length: numGroups }, () => []);

  entrants.forEach((entrant, i) => {
    const row = Math.floor(i / numGroups);
    const col = i % numGroups;
    const g = row % 2 === 0 ? col : numGroups - 1 - col; // serpentina
    groups[g].push(entrant);
  });

  return groups;
}
