import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { getCategoryStages, entryName } from "@/server/draw";
import { resetCompetitionDraw } from "@/server/actions/draw";
import { LiveDrawButton } from "@/components/live-draw-button";

export const dynamic = "force-dynamic";

type Cat = { id: number; name: string };

function parseCat(name: string) {
  const m = name.match(/^(Masculino|Feminino|Misto|Mx|M|F)\s*(\d+)/i);
  if (!m) return { g: "Z", lvl: 99 };
  const p = m[1].toLowerCase();
  const g = p === "f" || p.startsWith("femin") ? "F" : p === "mx" || p.startsWith("mist") ? "X" : "M";
  return { g, lvl: parseInt(m[2], 10) };
}

// Ordem do sorteio: intercala M/F por nível -> M1, F1, M2, F2, ...
function drawOrder<T extends Cat>(cats: T[]): T[] {
  const by = (g: string) => cats.filter((c) => parseCat(c.name).g === g).sort((a, b) => parseCat(a.name).lvl - parseCat(b.name).lvl);
  const M = by("M");
  const F = by("F");
  const X = cats.filter((c) => { const g = parseCat(c.name).g; return g !== "M" && g !== "F"; });
  const out: T[] = [];
  for (let i = 0; i < Math.max(M.length, F.length); i++) {
    if (M[i]) out.push(M[i]);
    if (F[i]) out.push(F[i]);
  }
  return [...out, ...X];
}

// Revelação ao vivo: cada grupo entra mais devagar e em sequência (Grupo A, depois B, …),
// e dentro de cada grupo os pares surgem um a um — para parecer sorteado na hora.
const GROUP_GAP = 1.3; // segundos entre grupos
const NAME_GAP = 0.22; // segundos entre pares dentro do grupo
const REVEAL_CSS =
  "@keyframes pzReveal{from{opacity:0;transform:translateY(22px) scale(.93)}to{opacity:1;transform:none}}" +
  ".pz-reveal{animation:pzReveal .6s cubic-bezier(.2,.7,.3,1) both}" +
  "@keyframes pzPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}" +
  ".pz-pop{animation:pzPop .45s cubic-bezier(.2,.7,.3,1) both}" +
  "@keyframes pzName{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}" +
  ".pz-name{animation:pzName .45s ease both}";

export default async function AoVivoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ i?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();
  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const ordered = drawOrder(comp.categories);
  const cats = await Promise.all(
    ordered.map(async (cat) => ({
      cat,
      stages: await getCategoryStages(cat.id),
      confirmed: await prisma.entry.count({ where: { categoryId: cat.id, status: "CONFIRMED" } }),
    })),
  );
  const total = cats.length;
  if (total === 0) {
    return <p className="text-sm text-muted">Esta competição ainda não tem categorias.</p>;
  }
  const drawnCount = cats.filter((c) => c.stages.length > 0).length;

  const i = Math.max(0, Math.min(parseInt(sp.i || "0", 10) || 0, total - 1));
  const cur = cats[i];
  const drawn = cur.stages.length > 0;
  const groupStage = cur.stages.find((s) => s.type === "GROUPS");
  const koStage = cur.stages.find((s) => s.type === "KNOCKOUT");

  let drawNames: string[] = [];
  if (!drawn && cur.confirmed >= 2) {
    const ents = await prisma.entry.findMany({
      where: { categoryId: cur.cat.id, status: "CONFIRMED" },
      include: { team: { include: { player1: true, player2: true } }, player: true },
    });
    drawNames = ents.map((e) =>
      e.team ? (e.team.player2 ? `${e.team.player1.name} / ${e.team.player2.name}` : e.team.player1.name) : e.player?.name ?? "—",
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <style>{REVEAL_CSS}</style>

      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <Link href={`/admin/torneios/${comp.id}/sorteio`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Sair
        </Link>
        {drawnCount > 0 && (
          <form action={resetCompetitionDraw}>
            <input type="hidden" name="competitionId" value={comp.id} />
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-soft">
              <RotateCcw className="size-3.5" /> Recomeçar
            </button>
          </form>
        )}
      </div>

      {/* Título */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-purple">Sorteio ao vivo</p>
        <h1 className="mt-1 text-lg font-bold text-zinc-900">{comp.name}</h1>
      </div>

      {/* Progresso por categoria */}
      <div className="flex flex-wrap justify-center gap-2">
        {cats.map((c, idx) => {
          const done = c.stages.length > 0;
          const active = idx === i;
          return (
            <Link
              key={c.cat.id}
              href={`?i=${idx}`}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition ${
                active ? "pz-gradient text-white shadow" : done ? "bg-success-bg text-success" : "bg-surface-soft text-soft"
              }`}
            >
              {done && !active && <Check className="size-3.5" />}
              {c.cat.name}
            </Link>
          );
        })}
      </div>

      {/* Cartão central da categoria atual */}
      <section className="pz-shadow-card rounded-3xl border border-line bg-surface p-8 text-center">
        <div className="pz-gradient pz-pop mx-auto grid size-24 place-items-center rounded-3xl text-4xl font-extrabold text-white shadow-lg">
          {cur.cat.name}
        </div>

        {!drawn ? (
          <div className="mt-5">
            <p className="text-sm text-muted">{cur.confirmed} pares inscritos · sorteio aleatório</p>
            {cur.confirmed < 2 ? (
              <p className="mt-4 text-sm text-soft">Sem pares suficientes para sortear (mínimo 2).</p>
            ) : (
              <div className="mt-5">
                <LiveDrawButton categoryId={cur.cat.id} categoryName={cur.cat.name} names={drawNames} />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {groupStage && (
              <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
                {groupStage.groups.map((g, gi) => (
                  <div key={g.id} className="pz-reveal rounded-2xl border border-line bg-surface-soft/50 p-4" style={{ animationDelay: `${(gi * GROUP_GAP).toFixed(2)}s` }}>
                    <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-brand-purple">{g.name}</p>
                    <ol className="space-y-1.5">
                      {g.members.map((mem, pi) => (
                        <li
                          key={mem.id}
                          className="pz-name flex items-start gap-2 text-sm text-zinc-800"
                          style={{ animationDelay: `${(gi * GROUP_GAP + 0.4 + pi * NAME_GAP).toFixed(2)}s` }}
                        >
                          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-surface-soft text-[10px] font-bold text-muted">{pi + 1}</span>
                          <span className="truncate">{entryName(mem.entry)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
            {!groupStage && koStage && <p className="text-sm text-muted">Quadro de eliminatórias sorteado.</p>}

            {/* Navegação */}
            <div className="mt-7 flex items-center justify-center gap-3">
              {i > 0 && (
                <Link href={`?i=${i - 1}`} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft">
                  <ArrowLeft className="size-4" /> Anterior
                </Link>
              )}
              {i < total - 1 ? (
                <Link href={`?i=${i + 1}`} className="pz-gradient inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:scale-[1.03] hover:opacity-95">
                  Próxima: {cats[i + 1].cat.name} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl bg-success-bg px-6 py-2.5 text-sm font-bold text-success">
                  <CheckCircle2 className="size-5" /> Sorteio completo!
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-soft">{drawnCount} de {total} categorias sorteadas</p>
    </div>
  );
}
