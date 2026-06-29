import { Trophy } from "lucide-react";

type BracketSide = { name: string; muted: boolean; winner: boolean };
type BracketMatch = { number: number; a: BracketSide; b: BracketSide; done: boolean };
type BracketRound = { round: number; label: string; matches: BracketMatch[] };

function Side({ side, done }: { side: BracketSide; done: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${side.winner ? "bg-success-bg/60" : ""}`}>
      <span className={`truncate text-sm ${side.muted ? "italic text-soft" : side.winner ? "font-bold text-zinc-900" : "font-medium text-zinc-700"}`}>
        {side.name}
      </span>
      {done && side.winner && <Trophy className="size-3.5 shrink-0 text-warning" />}
    </div>
  );
}

export function BracketView({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return <p className="text-sm text-soft">Sem quadro.</p>;

  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {rounds.map((round, ri) => {
        const isFinal = ri === rounds.length - 1;
        return (
          <div key={round.round} className="flex min-w-[220px] flex-col">
            <h3 className={`mb-3 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide ${isFinal ? "text-brand-purple" : "text-soft"}`}>
              {isFinal && <Trophy className="size-3.5" />} {round.label}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.matches.map((match) => (
                <div
                  key={match.number}
                  className={`overflow-hidden rounded-xl border bg-surface ${isFinal ? "pz-shadow-soft border-brand-purple/40" : "border-line"}`}
                >
                  <div className="flex items-center justify-between bg-surface-soft/60 px-3 py-1">
                    <span className="text-[10px] font-semibold text-soft">Jogo {match.number}</span>
                    {match.done && <span className="text-[10px] font-bold text-success">Terminado</span>}
                  </div>
                  <Side side={match.a} done={match.done} />
                  <div className="h-px bg-line" />
                  <Side side={match.b} done={match.done} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
