type GroupStanding = { name: string; played: number; won: number; lost: number; gamesFor: number; gamesAgainst: number; points: number };
type GroupMatch = { round: number; a: string; b: string };
type GroupBlock = { name: string; standings: GroupStanding[]; matches: GroupMatch[] };

// "Jogador 1 / Jogador 2" -> ["Jogador 1", "Jogador 2"]
function splitPair(name: string): [string, string | null] {
  const i = name.indexOf(" / ");
  return i === -1 ? [name, null] : [name.slice(0, i), name.slice(i + 3)];
}

export function GroupsView({ groups, qualifyCount = 0 }: { groups: GroupBlock[]; qualifyCount?: number }) {
  if (groups.length === 0) return <p className="text-sm text-soft">Sem grupos.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <div key={group.name} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line bg-surface-soft/60 px-4 py-2.5">
            <h3 className="text-sm font-bold text-zinc-900">{group.name}</h3>
            {qualifyCount > 0 && <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">apuram-se {qualifyCount}</span>}
          </div>

          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-soft">
                <th className="w-9 py-2 pl-3 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Dupla</th>
                <th className="w-8 py-2 text-center font-semibold">J</th>
                <th className="w-8 py-2 text-center font-semibold">V</th>
                <th className="w-8 py-2 text-center font-semibold">D</th>
                <th className="w-9 py-2 text-center font-semibold" title="Jogos ganhos">Pg</th>
                <th className="w-9 py-2 text-center font-semibold" title="Jogos sofridos">Ps</th>
                <th className="w-11 py-2 text-center font-semibold" title="Diferença de jogos (Pg menos Ps)">Dif.</th>
                <th className="w-12 py-2 pr-3 text-right font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.standings.map((s, i) => {
                const qual = qualifyCount > 0 && i < qualifyCount;
                const [p1, p2] = splitPair(s.name);
                const diff = s.gamesFor - s.gamesAgainst;
                return (
                  <tr key={s.name} className={`border-t border-line align-middle ${qual ? "bg-success-bg/40" : ""}`}>
                    <td className="py-2.5 pl-3">
                      <span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${qual ? "bg-success text-white" : "bg-surface-soft text-muted"}`}>{i + 1}</span>
                    </td>
                    <td className="min-w-0 py-2.5 pr-2">
                      <p className="truncate font-medium text-zinc-900">{p1}</p>
                      {p2 && <p className="truncate text-zinc-600">{p2}</p>}
                    </td>
                    <td className="py-2.5 text-center tabular-nums text-muted">{s.played}</td>
                    <td className="py-2.5 text-center tabular-nums text-muted">{s.won}</td>
                    <td className="py-2.5 text-center tabular-nums text-muted">{s.lost}</td>
                    <td className="py-2.5 text-center tabular-nums text-muted">{s.gamesFor}</td>
                    <td className="py-2.5 text-center tabular-nums text-muted">{s.gamesAgainst}</td>
                    <td className="py-2.5 text-center tabular-nums font-semibold text-zinc-700">{diff > 0 ? `+${diff}` : diff}</td>
                    <td className="py-2.5 pr-3 text-right text-base font-bold tabular-nums text-brand-purple">{s.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {group.matches.length > 0 && (
            <div className="border-t border-line p-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-soft">Jogos</h4>
              <ul className="space-y-1.5">
                {[...group.matches]
                  .sort((a, b) => a.round - b.round)
                  .map((m, i) => {
                    const [a1, a2] = splitPair(m.a);
                    const [b1, b2] = splitPair(m.b);
                    return (
                      <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-soft/60 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1 text-zinc-700">
                          <p className="truncate">{a1}</p>
                          {a2 && <p className="truncate text-xs text-muted">{a2}</p>}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-soft">vs</span>
                        <div className="min-w-0 flex-1 text-right text-zinc-700">
                          <p className="truncate">{b1}</p>
                          {b2 && <p className="truncate text-xs text-muted">{b2}</p>}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
