import { Swords, MapPin, CalendarClock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyGames, type MyGame } from "@/server/player-area";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jogos · PadelZone" };

const whenFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function GameCard({ g }: { g: MyGame }) {
  const sets = g.sets?.map((s) => `${s.a}-${s.b}`).join("  ") ?? "";
  return (
    <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-lg bg-primary-light px-2.5 py-1 text-xs font-bold text-brand-purple">{g.category} · {g.section}</span>
        {g.done && g.won != null ? (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${g.won ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>{g.won ? "Vitória" : "Derrota"}</span>
        ) : (
          <span className="truncate text-xs text-muted">{g.competition}</span>
        )}
      </div>

      <div className="mt-2.5">
        <p className="text-[11px] uppercase tracking-wide text-soft">A tua dupla</p>
        <p className="truncate font-semibold text-zinc-900">{g.mine}</p>
        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-soft">Adversário</p>
        <p className="truncate font-medium text-zinc-700">{g.opponent}</p>
      </div>

      {g.done && sets && <p className="mt-2 font-mono text-base font-bold tabular-nums text-zinc-900">{sets}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
        {g.when && <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-soft" /> {whenFmt.format(g.when)}</span>}
        {g.court && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-soft" /> {g.court}</span>}
        {!g.done && !g.when && <span>Por agendar</span>}
      </div>
    </div>
  );
}

export default async function JogosPage() {
  const user = await getCurrentUser();
  const { upcoming, played } = await getMyGames(user!.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">Os meus jogos</h1>
        <p className="mt-1 text-sm text-muted">Os teus próximos jogos e os já disputados.</p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-zinc-900">
          <CalendarClock className="size-4 text-brand-purple" /> Próximos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            Sem jogos agendados. Aparecem aqui quando te inscreveres num torneio e o sorteio for feito.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{upcoming.map((g) => <GameCard key={g.id} g={g} />)}</div>
        )}
      </section>

      {played.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-zinc-900">
            <Swords className="size-4 text-brand-purple" /> Disputados ({played.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{played.map((g) => <GameCard key={g.id} g={g} />)}</div>
        </section>
      )}
    </div>
  );
}
