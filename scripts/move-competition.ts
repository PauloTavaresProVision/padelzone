/**
 * Move um torneio (e os seus jogadores) para outro clube.
 * Uso:
 *   npx tsx scripts/move-competition.ts --to=<slug ou parte do nome do clube> [--comp="Nome do torneio"]
 *   (sem --to, apenas LISTA os clubes e torneios para veres o estado)
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const compName = args.find((a) => a.startsWith("--comp="))?.split("=")[1] || "Standard Bank Padel Open 2026";
const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1];
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

(async () => {
  const clubs = await prisma.club.findMany({ select: { id: true, name: true, slug: true } });
  console.log("Clubes:");
  clubs.forEach((c) => console.log(`  [${c.id}] ${c.name}  (slug: ${c.slug})`));

  const comps = await prisma.competition.findMany({ where: { name: compName }, select: { id: true, name: true, slug: true, clubId: true } });
  const withCounts = await Promise.all(comps.map(async (c) => ({ ...c, entries: await prisma.entry.count({ where: { category: { competitionId: c.id } } }) })));
  console.log(`\nTorneios "${compName}":`);
  withCounts.forEach((c) => console.log(`  id ${c.id} -> clube [${c.clubId}] ${clubs.find((k) => k.id === c.clubId)?.name}  | inscrições: ${c.entries}`));

  if (!toArg) { console.log("\n(Para mover: --to=<slug ou parte do nome do clube destino>)"); await prisma.$disconnect(); return; }

  const target = clubs.find((c) => c.slug === toArg) || clubs.find((c) => c.name.toLowerCase().includes(toArg.toLowerCase()));
  if (!target) { console.log(`\nClube destino não encontrado para "${toArg}".`); await prisma.$disconnect(); return; }

  if (withCounts.some((c) => c.clubId === target.id)) {
    console.log(`\nATENÇÃO: o clube "${target.name}" já tem um torneio "${compName}". Não movi nada — decide qual ficas/apagas e diz-me.`);
    await prisma.$disconnect(); return;
  }

  const source = withCounts.filter((c) => c.clubId !== target.id).sort((a, b) => b.entries - a.entries)[0];
  if (!source) { console.log("\nNada para mover."); await prisma.$disconnect(); return; }

  // Evita conflito de slug único por clube.
  const slugTaken = await prisma.competition.findFirst({ where: { clubId: target.id, slug: source.slug } });
  const newSlug = slugTaken ? `${slugify(compName)}-${source.id}` : source.slug;

  await prisma.competition.update({ where: { id: source.id }, data: { clubId: target.id, slug: newSlug } });

  const teams = await prisma.team.findMany({ where: { entries: { some: { category: { competitionId: source.id } } } }, select: { player1Id: true, player2Id: true } });
  const pids = [...new Set(teams.flatMap((t) => [t.player1Id, t.player2Id]).filter((x): x is number => !!x))];
  const upd = await prisma.player.updateMany({ where: { id: { in: pids } }, data: { clubId: target.id } });

  console.log(`\nMOVIDO: torneio "${compName}" (id ${source.id}) -> clube "${target.name}". Jogadores reatribuídos: ${upd.count}.`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
