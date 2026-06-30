import Link from "next/link";
import { notFound } from "next/navigation";
import { Shuffle, Trash2, Trophy, Radio, Users, Sparkles, Info, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { getCompetition } from "@/server/competitions";
import { getCategoryStages, sideName, entryName } from "@/server/draw";
import { launchDraw, generateQualifiers, clearDraw, swapQualifier } from "@/server/actions/draw";
import { findQualifierTies } from "@/server/draw-engine";
import { BracketView } from "@/components/bracket-view";
import { GroupsView } from "@/components/groups-view";
import { TournamentHeader } from "@/components/tournament-header";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: "Eliminatórias",
  GROUPS: "Só fase de grupos / Liga",
  GROUPS_KNOCKOUT: "Grupos + Eliminatórias",
};

function roundLabel(round: number, total: number) {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Meias-finais";
  if (fromEnd === 2) return "Quartos de final";
  if (fromEnd === 3) return "Oitavos de final";
  return `${round + 1}ª ronda`;
}

type Stage = Awaited<ReturnType<typeof getCategoryStages>>[number];

function BracketFromStage({ stage }: { stage: Stage }) {
  const ms = stage.matches;
  const total = ms.length ? Math.max(...ms.map((m) => m.round)) + 1 : 0;
  const numberOf = new Map<number, number>();
  ms.forEach((m, i) => numberOf.set(m.id, i + 1));
  const roundsMap = new Map<number, typeof ms>();
  for (const m of ms) {
    const arr = roundsMap.get(m.round) ?? [];
    arr.push(m);
    roundsMap.set(m.round, arr);
  }
  const rounds = [...roundsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, list]) => ({
      round,
      label: roundLabel(round, total),
      matches: list.map((m) => {
        const a = m.sides.find((s) => s.side === "A");
        const b = m.sides.find((s) => s.side === "B");
        const ws = m.result?.winnerSide ?? null;
        const toSide = (s: typeof a, key: "A" | "B") =>
          s
            ? { name: sideName(s), muted: !s.team && s.players.length === 0, winner: m.status === "DONE" && ws === key }
            : { name: "—", muted: true, winner: false };
        return { number: numberOf.get(m.id)!, a: toSide(a, "A"), b: toSide(b, "B"), done: m.status === "DONE" };
      }),
    }));
  return <BracketView rounds={rounds} />;
}

function GroupsFromStage({ stage, qualifyCount, qualifiedIds }: { stage: Stage; qualifyCount: number; qualifiedIds: Set<number> }) {
  const blocks = stage.groups.map((g) => ({
    name: g.name,
    standings: stage.standings
      .filter((s) => s.groupId === g.id)
      .map((s) => ({ name: entryName(s.entry), played: s.played, won: s.won, lost: s.lost, gamesFor: s.gamesFor, gamesAgainst: s.gamesAgainst, points: s.points, best: qualifiedIds.has(s.entry.id) }))
      .sort(
        (a, b) =>
          (b.played ? b.won / b.played : 0) - (a.played ? a.won / a.played : 0) ||
          (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst),
      ),
    matches: stage.matches
      .filter((m) => m.groupId === g.id)
      .map((m) => ({
        round: m.round,
        a: sideName(m.sides.find((s) => s.side === "A")!),
        b: sideName(m.sides.find((s) => s.side === "B")!),
      })),
  }));
  return <GroupsView groups={blocks} qualifyCount={qualifyCount} />;
}

export default async function SorteioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const comp = await getCompetition(Number(id));
  if (!comp || comp.clubId !== club.id) notFound();

  const categories = await Promise.all(
    comp.categories.map(async (cat) => {
      const confEntries = await prisma.entry.findMany({
        where: { categoryId: cat.id, status: "CONFIRMED" },
        select: { team: { select: { player1: { select: { invitePending: true } }, player2: { select: { invitePending: true } } } }, player: { select: { invitePending: true } } },
      });
      const pendingPartner = confEntries.filter(
        (e) => e.team?.player1?.invitePending || e.team?.player2?.invitePending || e.player?.invitePending,
      ).length;
      return { cat, stages: await getCategoryStages(cat.id), confirmed: confEntries.length, pendingPartner };
    }),
  );
  const drawnCount = categories.filter((c) => c.stages.length > 0).length;
  const sel = sp.cat && categories.some((c) => c.cat.name === sp.cat) ? sp.cat : "Todas";
  const shown = sel === "Todas" ? categories : categories.filter((c) => c.cat.name === sel);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <TournamentHeader
        compId={comp.id}
        title="Sorteio"
        subtitle="Lança o sorteio aleatório de cada categoria."
        help={[
          { label: "Sorteio aleatório e justo", desc: "Os confrontos são gerados ao acaso, ninguém escolhe quem joga com quem. Mesmo com cabeças de série, as restantes posições são sorteadas aleatoriamente." },
          { label: "Cabeças de série", desc: "Se a categoria as usar, as duplas mais fortes (1, 2, … definidas nas Inscrições) são colocadas em zonas opostas do quadro, para só se poderem cruzar nas fases finais." },
          { label: "Formato por categoria", desc: "Cada categoria sorteia conforme o seu formato (Eliminatórias, Grupos + Eliminatórias ou Liga), definido no separador Categorias." },
          { label: "Sorteio ao vivo", desc: "Podes lançar à frente do público, categoria a categoria, carregando tu no botão, para todos verem que é transparente. 'Recomeçar' limpa o sorteio para o repetires." },
          { label: "Apuramento (Grupos + Eliminatórias)", desc: "Terminada a fase de grupos, escolhes quantas duplas passam ao quadro final. O sistema apura por ordem: todos os 1ºs dos grupos, depois os 2ºs e, se faltarem duplas para encher o quadro, os MELHORES 3ºs, 4ºs… comparados entre todos os grupos (por pontos, diferença de sets e de jogos). É o que resolve quando não tens um número 'redondo' de duplas, e podes refazê-lo já depois dos grupos." },
          { label: "Quadro afasta o mesmo grupo", desc: "Ao gerar o quadro de apuramento, as duplas do mesmo grupo são afastadas: não há revanche logo na 1ª ronda e o 2º de um grupo fica na metade oposta à do 1º do mesmo grupo, para só se poderem reencontrar o mais tarde possível. Aplica-se quando os apurados enchem o quadro (4, 8, 16, 32)." },
        ]}
      />

      {/* Barra de ação: sorteio ao vivo + progresso */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Apresentação ao público</p>
          <p className="text-sm text-muted">Lança categoria a categoria, ao vivo, num ecrã grande.</p>
        </div>
        <Link
          href={`/admin/torneios/${comp.id}/ao-vivo`}
          className="pz-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
        >
          <Radio className="size-4" /> Sorteio ao vivo
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted">Esta competição ainda não tem categorias.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            <strong className="text-zinc-900">{drawnCount}</strong> de <strong className="text-zinc-900">{categories.length}</strong> categorias sorteadas.
          </p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <Link
              href={`/admin/torneios/${comp.id}/sorteio`}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                sel === "Todas" ? "pz-gradient border-transparent text-white" : "border-line bg-surface text-muted hover:bg-surface-soft"
              }`}
            >
              Todas
            </Link>
            {categories.map(({ cat, stages }) => (
              <Link
                key={cat.id}
                href={`?cat=${encodeURIComponent(cat.name)}`}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                  sel === cat.name ? "pz-gradient border-transparent text-white" : "border-line bg-surface text-muted hover:bg-surface-soft"
                }`}
              >
                <span className={`size-1.5 rounded-full ${sel === cat.name ? "bg-white/80" : stages.length > 0 ? "bg-success" : "bg-soft"}`} />
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {shown.map(({ cat, stages, confirmed, pendingPartner }) => {
        const groupStage = stages.find((s) => s.type === "GROUPS");
        const koStage = stages.find((s) => s.type === "KNOCKOUT");
        const formatLabel = FORMAT_LABEL[cat.format] ?? cat.format;
        const groupsDone = groupStage ? groupStage.matches.length > 0 && groupStage.matches.every((m) => m.status === "DONE") : false;
        // O quadro pode existir só como esqueleto ("Apurado N", sem duplas). Está "preenchido"
        // quando já tem duplas reais. Enquanto não estiver, mostra-se o botão de apuramento.
        const koFilled = !!koStage && koStage.matches.some((km) => km.sides.some((s) => s.teamId != null));
        const needQualifiers = cat.format === "GROUPS_KNOCKOUT" && !!groupStage;
        const qualifyCount = cat.format === "GROUPS_KNOCKOUT" ? cat.qualifiersPerGroup : 0;
        // Entradas que estão no quadro (apurados) — para destacar a amarelo os melhores 3ºs.
        const qualifiedIds = new Set<number>();
        if (groupStage && koStage) {
          const teamToEntry = new Map<number, number>();
          const playerToEntry = new Map<number, number>();
          for (const st of groupStage.standings) {
            if (st.entry.teamId) teamToEntry.set(st.entry.teamId, st.entry.id);
            if (st.entry.playerId) playerToEntry.set(st.entry.playerId, st.entry.id);
          }
          for (const m of koStage.matches)
            for (const side of m.sides) {
              if (side.teamId != null && teamToEntry.has(side.teamId)) qualifiedIds.add(teamToEntry.get(side.teamId)!);
              for (const p of side.players) if (playerToEntry.has(p.playerId)) qualifiedIds.add(playerToEntry.get(p.playerId)!);
            }
        }
        // Empate TOTAL na vaga de corte (duplas indistinguíveis) — precisa de sorteio manual.
        let qualifierTie: { spots: number; ins: { id: number; name: string }[]; outs: { id: number; name: string }[] } | null = null;
        if (groupStage && koFilled && qualifiedIds.size > 0) {
          const rows = groupStage.standings.map((s) => ({ id: s.entry.id, rank: s.rank, won: s.won, played: s.played, gamesFor: s.gamesFor, gamesAgainst: s.gamesAgainst, setsFor: s.setsFor, setsAgainst: s.setsAgainst }));
          const tie = findQualifierTies(rows, qualifiedIds.size);
          if (tie) {
            const nameById = new Map(groupStage.standings.map((s) => [s.entry.id, entryName(s.entry)]));
            qualifierTie = {
              spots: tie.spots,
              ins: tie.ids.filter((id) => qualifiedIds.has(id)).map((id) => ({ id, name: nameById.get(id) ?? "?" })),
              outs: tie.ids.filter((id) => !qualifiedIds.has(id)).map((id) => ({ id, name: nameById.get(id) ?? "?" })),
            };
          }
        }
        const defaultQ = Math.min(confirmed, cat.numGroups * cat.qualifiersPerGroup);
        // Recomendado: o quadro "cheio" mais próximo (potência de 2, sem isentos), conforme o nº de duplas.
        const recommendedQ = (() => {
          const base = Math.max(2, defaultQ);
          const up = 1 << Math.ceil(Math.log2(base));
          const down = 1 << Math.floor(Math.log2(base));
          return up <= confirmed ? up : Math.min(down, confirmed);
        })();
        const qualSizes = (() => {
          const g = cat.numGroups;
          // Descreve a composição do quadro: "X de cada grupo (+ R melhores (X+1)ºs)".
          const describe = (n: number) => {
            const per = Math.floor(n / g);
            const rem = n % g;
            if (per < 1) return `${n} melhores 1ºs`;
            const base = `${per} de cada grupo`;
            return rem > 0 ? `${base} + ${rem} melhores ${per + 1}ºs` : base;
          };
          const m = new Map<number, string>();
          for (const s of [4, 8, 16, 32]) if (s >= 2 && s <= confirmed) m.set(s, `${describe(s)} (${s})`);
          if (defaultQ >= 2) m.set(defaultQ, `${describe(defaultQ)} (${defaultQ})`);
          if (recommendedQ >= 2) m.set(recommendedQ, `${describe(recommendedQ)} (${recommendedQ})`);
          if (confirmed >= 2) m.set(confirmed, `Todas (${confirmed})`);
          return [...m.entries()]
            .filter(([v]) => v >= 2)
            .sort((a, b) => a[0] - b[0])
            .map(([v, l]) => [v, v === recommendedQ ? `${l} · recomendado` : l] as [number, string]);
        })();

        // Campeão (final das eliminatórias concluída)
        let champion: string | null = null;
        if (koStage && koStage.matches.length) {
          const maxRound = Math.max(...koStage.matches.map((m) => m.round));
          const final = koStage.matches.find((m) => m.round === maxRound);
          if (final?.status === "DONE" && final.result?.winnerSide) {
            const ws = final.sides.find((s) => s.side === final.result!.winnerSide);
            if (ws) champion = sideName(ws);
          }
        }

        return (
          <section key={cat.id} className="pz-shadow-card overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-soft/40 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-primary-light px-2.5 py-1 text-sm font-bold text-brand-purple">{cat.name}</span>
                <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-semibold text-muted">{formatLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Users className="size-3.5 text-soft" /> {confirmed} confirmadas
                </span>
                {stages.length > 0 && (
                  <form action={clearDraw}>
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <ConfirmButton message="Isto apaga o sorteio desta categoria (grupos e quadro de apuramento). Continuar?" className="inline-flex items-center gap-1.5 text-xs font-medium text-danger transition hover:opacity-80">
                      <Trash2 className="size-3.5" /> Limpar
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>

            <div className="p-5">
              {pendingPartner > 0 && (
                <p className="mb-4 rounded-xl border border-warning/30 bg-warning-bg/50 px-4 py-2.5 text-sm text-warning">
                  {pendingPartner} {pendingPartner === 1 ? "dupla não entra" : "duplas não entram"} no sorteio até o parceiro criar conta na plataforma.
                </p>
              )}
              {stages.length === 0 ? (
                confirmed < 2 ? (
                  <div className="rounded-xl border border-dashed border-line p-8 text-center">
                    <Shuffle className="mx-auto size-7 text-soft" />
                    <p className="mt-2 text-sm text-muted">São precisas pelo menos 2 inscrições confirmadas para lançar o sorteio.</p>
                  </div>
                ) : (
                  <form action={launchDraw} className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-purple/30 bg-primary-light/30 p-8 text-center">
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <Sparkles className="size-7 text-brand-purple" />
                    <p className="text-sm text-muted">
                      Pronto a sortear <strong className="text-zinc-900">{confirmed}</strong> duplas
                      {cat.useSeeds ? " · com cabeças de série" : " · 100% aleatório"}
                    </p>
                    <button className="pz-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">
                      <Shuffle className="size-4" /> Lançar sorteio
                    </button>
                  </form>
                )
              ) : (
                <div className="space-y-5">
                  {champion && (
                    <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-bg/50 px-4 py-3">
                      <Trophy className="size-5 shrink-0 text-warning" />
                      <p className="text-sm">
                        <span className="text-muted">Campeão:</span> <strong className="text-zinc-900">{champion}</strong>
                      </p>
                    </div>
                  )}

                  {stages.map((s) => (
                    <div key={s.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-brand-purple" />
                        <span className="text-xs font-bold uppercase tracking-wide text-soft">{s.name}</span>
                      </div>
                      {s.type === "KNOCKOUT" ? (
                        <>
                          {cat.format === "GROUPS_KNOCKOUT" && koFilled && (
                            <div className="mb-3 rounded-xl border border-line bg-surface-soft/50 px-4 py-3 text-xs leading-relaxed text-muted">
                              <p className="mb-1 flex items-center gap-1.5 font-semibold text-zinc-700">
                                <Info className="size-3.5 text-brand-purple" /> Como foi feito este quadro
                              </p>
                              <ul className="ml-1 list-inside list-disc space-y-0.5">
                                <li>As cabeças de série são os <strong>1ºs dos grupos</strong>, por ordem de classificação.</li>
                                <li>Cada 1º joga contra um dos <strong>últimos apurados</strong>: primeiro os 3ºs e, quando faltam, os piores 2ºs.</li>
                                <li>Duplas do <strong>mesmo grupo</strong> nunca se cruzam na 1ª ronda.</li>
                                <li>Nas tabelas dos grupos, os <strong className="text-warning">melhores 3ºs</strong> apurados aparecem a amarelo.</li>
                              </ul>
                            </div>
                          )}
                          <BracketFromStage stage={s} />
                        </>
                      ) : <GroupsFromStage stage={s} qualifyCount={qualifyCount} qualifiedIds={qualifiedIds} />}
                    </div>
                  ))}

                  {qualifierTie && qualifierTie.ins.length > 0 && qualifierTie.outs.length > 0 && (
                    <div className="rounded-xl border border-warning/40 bg-warning-bg/40 p-4">
                      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <AlertTriangle className="size-4 text-warning" /> Empate pela última vaga (sorteio)
                      </p>
                      <p className="mb-3 text-xs text-muted">
                        Estas duplas ficaram exatamente empatadas em tudo (vitórias, jogos e sets). Apura{qualifierTie.spots > 1 ? `m ${qualifierTie.spots}` : ""}. Faz o sorteio e escolhe quem fica no quadro.
                      </p>
                      <div className="space-y-2">
                        {qualifierTie.outs.map((out) => (
                          <div key={out.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-muted">Pôr <strong className="text-zinc-900">{out.name}</strong> no lugar de:</span>
                            {qualifierTie!.ins.map((inn) => (
                              <form key={inn.id} action={swapQualifier}>
                                <input type="hidden" name="categoryId" value={cat.id} />
                                <input type="hidden" name="inEntryId" value={inn.id} />
                                <input type="hidden" name="outEntryId" value={out.id} />
                                <button className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-surface-soft">{inn.name}</button>
                              </form>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {needQualifiers &&
                    (groupsDone ? (
                      <form action={generateQualifiers} className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-purple/30 bg-primary-light/30 p-5 text-center">
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <Trophy className="size-6 text-brand-purple" />
                        <div className="flex flex-col items-center gap-1.5">
                          <label className="text-sm font-medium text-zinc-900">Quantas duplas apuram para o quadro final?</label>
                          <select name="size" defaultValue={recommendedQ} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none">
                            {qualSizes.map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <ConfirmButton message={koFilled ? "Refazer o quadro SUBSTITUI o atual e perde o que já lá estava. Continuar?" : "Gerar o quadro de apuramento com este tamanho?"} className="pz-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">
                          <Trophy className="size-4" /> {koFilled ? "Refazer quadro de apuramento" : "Gerar quadro de apuramento"}
                        </ConfirmButton>
                        <span className="max-w-md text-xs text-muted">Apura por ordem: todos os 1ºs, depois os 2ºs e, se faltarem para encher o quadro, os melhores 3ºs, 4ºs… comparados entre todos os grupos. Podes voltar a gerar.</span>
                      </form>
                    ) : (
                      <p className="rounded-xl border border-line bg-surface-soft/50 px-4 py-3 text-center text-xs text-muted">
                        Conclui todos os jogos da fase de grupos para gerar o quadro de apuramento.
                      </p>
                    ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
