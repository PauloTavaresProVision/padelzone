/**
 * Lista todos os torneios (e junta dois, se pedido).
 *
 * Listar:   npx tsx scripts/comps.ts
 * Juntar:   npx tsx scripts/comps.ts --from=<id origem> --into=<id destino>            (pré-visualização)
 *           npx tsx scripts/comps.ts --from=<id origem> --into=<id destino> --confirm  (executa)
 *
 * Juntar move as inscrições das categorias da origem para as categorias com o MESMO nome
 * no destino (cria/adota as que faltarem), reatribui os jogadores ao clube do destino e
 * apaga o torneio de origem (que fica vazio). Não toca em sorteios já feitos no destino.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const args = process.argv.slice(2);
const from = Number(args.find((a) => a.startsWith("--from="))?.split("=")[1]) || 0;
const into = Number(args.find((a) => a.startsWith("--into="))?.split("=")[1]) || 0;
const confirm = args.includes("--confirm");

(async () => {
  if (!from || !into) {
    const clubs = await prisma.club.findMany({ select: { id: true, name: true } });
    const comps = await prisma.competition.findMany({ select: { id: true, name: true, clubId: true }, orderBy: { id: "asc" } });
    console.log("Torneios (todos os clubes):");
    for (const c of comps) {
      const cats = await prisma.category.count({ where: { competitionId: c.id } });
      const ents = await prisma.entry.count({ where: { category: { competitionId: c.id } } });
      console.log(`  id ${c.id}  "${c.name}"  | clube: ${clubs.find((k) => k.id === c.clubId)?.name}  | categorias: ${cats}  inscrições: ${ents}`);
    }
    console.log("\nPara juntar:  --from=<id origem> --into=<id destino>  (acrescenta --confirm para executar)");
    await prisma.$disconnect(); return;
  }

  const src = await prisma.competition.findUnique({ where: { id: from }, include: { categories: true, club: true } });
  const dst = await prisma.competition.findUnique({ where: { id: into }, include: { categories: true, club: true } });
  if (!src || !dst) { console.log("Origem ou destino não encontrado."); await prisma.$disconnect(); return; }
  console.log(`Juntar  [${from}] "${src.name}" (${src.club.name})  ->  [${into}] "${dst.name}" (${dst.club.name})\n`);

  const plan: { srcCatId: number; name: string; ents: number; targetId: number | null }[] = [];
  for (const sc of src.categories) {
    const ents = await prisma.entry.count({ where: { categoryId: sc.id } });
    const target = dst.categories.find((d) => d.name.toUpperCase() === sc.name.toUpperCase());
    plan.push({ srcCatId: sc.id, name: sc.name, ents, targetId: target?.id ?? null });
    console.log(`  ${sc.name}: ${ents} inscrições -> ${target ? "categoria existente no destino" : "categoria movida para o destino"}`);
  }
  if (!confirm) { console.log("\n(PRÉ-VISUALIZAÇÃO — nada gravado. Acrescenta --confirm para executar.)"); await prisma.$disconnect(); return; }

  let moved = 0;
  for (const p of plan) {
    if (p.targetId) {
      const r = await prisma.entry.updateMany({ where: { categoryId: p.srcCatId }, data: { categoryId: p.targetId } });
      moved += r.count;
      await prisma.category.delete({ where: { id: p.srcCatId } });
    } else {
      await prisma.category.update({ where: { id: p.srcCatId }, data: { competitionId: into } });
    }
  }
  const teams = await prisma.team.findMany({ where: { entries: { some: { category: { competitionId: into } } } }, select: { player1Id: true, player2Id: true } });
  const pids = [...new Set(teams.flatMap((t) => [t.player1Id, t.player2Id]).filter((x): x is number => !!x))];
  await prisma.player.updateMany({ where: { id: { in: pids } }, data: { clubId: dst.clubId } });
  await prisma.competition.delete({ where: { id: from } });
  console.log(`\nFEITO: ${moved} inscrições movidas para categorias existentes; torneio origem [${from}] apagado.`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
