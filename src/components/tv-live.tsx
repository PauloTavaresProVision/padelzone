type LiveItem = { id: number; court: string; cat: string; section: string; nameA: string; nameB: string };
type NextItem = { id: number; tk: string; court: string; cat: string; section: string; nameA: string; nameB: string };

// Cor própria por categoria (tom claro), para distinguir num relance.
function hue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// Painel "transmissão": jogos a decorrer em destaque + próximos jogos em lista.
export function TvLive({ live, upcoming }: { live: LiveItem[]; upcoming: NextItem[] }) {
  return (
    <div className="flex h-full flex-col gap-5">
      {/* Ao vivo */}
      <section className="shrink-0">
        <p className="mb-2.5 text-base font-black uppercase tracking-[0.2em] text-rose-600">Ao vivo</p>
        {live.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-7 text-center text-2xl font-semibold text-muted">
            Sem jogos a decorrer neste momento.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {live.map((g) => {
              const h = hue(g.cat);
              return (
                <div key={g.id} className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-[0_0_0_1px_rgba(244,63,94,0.1)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-sm font-black uppercase text-white">
                      <span className="size-2 animate-pulse rounded-full bg-white" /> Live · {g.court}
                    </span>
                    <span className="truncate rounded-md px-2.5 py-1 text-xs font-bold" style={{ background: `hsl(${h} 78% 94%)`, color: `hsl(${h} 55% 38%)` }}>{g.cat} · {g.section}</span>
                  </div>
                  <p className="truncate text-2xl font-extrabold leading-tight text-zinc-900">{g.nameA}</p>
                  <p className="my-1 text-sm font-bold uppercase tracking-wider text-rose-300">vs</p>
                  <p className="truncate text-2xl font-extrabold leading-tight text-zinc-900">{g.nameB}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* A seguir */}
      <section className="flex min-h-0 flex-1 flex-col">
        <p className="mb-2.5 text-base font-black uppercase tracking-[0.2em] text-brand-purple">A seguir</p>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden">
          {upcoming.length === 0 ? (
            <p className="text-2xl text-muted">Sem próximos jogos agendados.</p>
          ) : (
            upcoming.map((g) => {
              const h = hue(g.cat);
              return (
                <div key={g.id} className="pz-shadow-card flex items-center gap-5 rounded-xl border border-line bg-surface px-5 py-3.5">
                  <span className="w-24 shrink-0 text-3xl font-black text-brand-purple">{g.tk}</span>
                  <span className="shrink-0 rounded-lg bg-surface-soft px-3 py-1.5 text-base font-bold text-muted">{g.court}</span>
                  <span className="shrink-0 rounded-md px-2.5 py-1 text-sm font-bold" style={{ background: `hsl(${h} 78% 94%)`, color: `hsl(${h} 55% 38%)` }}>{g.cat} · {g.section}</span>
                  <span className="min-w-0 flex-1 truncate text-xl font-semibold text-zinc-800">
                    {g.nameA} <span className="px-1 text-soft">vs</span> {g.nameB}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
