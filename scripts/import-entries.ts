/**
 * Importa duplas pagas de um CSV para um torneio (por defeito "Standard Bank Padel Open 2026").
 *
 * CSV (separador ";"), cabeçalho:
 *   team_name;p1_name;p1_email;p1_phone;p2_name;p2_email;p2_phone;tournament_name
 * onde a última coluna ("tournament_name") é o CÓDIGO DA CATEGORIA (F1, F2, F3, M1, M2, M3, M4...).
 *
 * Uso:
 *   npx tsx scripts/import-entries.ts caminho/para/ficheiro.csv [--dry-run] [--club=slug] [--comp="Nome"]
 *   (ou via stdin)  ... npx tsx scripts/import-entries.ts < ficheiro.csv
 *
 * - Cria/encontra o torneio e as categorias (género a partir do código).
 * - Cria jogadores (dedup por EMAIL; NUNCA junta pessoas diferentes que partilhem telefone).
 * - Cria as duplas e inscrições CONFIRMADAS (pagas). Idempotente: não duplica duplas já inscritas.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clubSlug = args.find((a) => a.startsWith("--club="))?.split("=")[1];
const compName = args.find((a) => a.startsWith("--comp="))?.split("=")[1] || "Standard Bank Padel Open 2026";
const fileArg = args.find((a) => !a.startsWith("--"));

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const normEmail = (raw: string | undefined) => {
  const s = String(raw ?? "").trim().toLowerCase();
  return s.includes("@") ? s : null;
};
const normPhone = (raw: string | undefined) => {
  let s = String(raw ?? "").trim();
  if (!s || /[eE]\+/.test(s)) return null; // ignora notação científica do Excel (3.51912E+11)
  s = s.replace(/\D/g, "");
  return s.length >= 9 ? s.slice(-9) : null; // últimos 9 dígitos (tira indicativo)
};
const genderOf = (code: string): "MALE" | "FEMALE" | "MIXED" => {
  const c = code.trim().toUpperCase();
  if (c.startsWith("MX") || c.startsWith("MISTO")) return "MIXED";
  if (c.startsWith("F")) return "FEMALE";
  return "MALE";
};

type Row = { team: string; p1n: string; p1e?: string; p1p?: string; p2n: string; p2e?: string; p2p?: string; cat: string };

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const c = line.split(";");
    return { team: (c[0] ?? "").trim(), p1n: (c[1] ?? "").trim(), p1e: c[2], p1p: c[3], p2n: (c[4] ?? "").trim(), p2e: c[5], p2p: c[6], cat: (c[7] ?? "").trim() };
  }).filter((r) => r.cat && r.p1n);
}

async function main() {
  const text = fileArg ? readFileSync(fileArg, "utf8") : readFileSync(0, "utf8");
  const rows = parseCsv(text);
  if (!rows.length) { console.error("CSV vazio ou sem linhas válidas."); process.exit(1); }

  // Torneio: procurar pelo nome em QUALQUER clube; senão criar no clube indicado (ou o 1.º).
  let comp = await prisma.competition.findFirst({ where: { name: compName } });
  const club = comp
    ? await prisma.club.findUnique({ where: { id: comp.clubId } })
    : clubSlug
      ? await prisma.club.findUnique({ where: { slug: clubSlug } })
      : await prisma.club.findFirst({ orderBy: { id: "asc" } });
  if (!club) { console.error("Clube não encontrado."); process.exit(1); }
  if (!comp && !dryRun) {
    comp = await prisma.competition.create({ data: { clubId: club.id, name: compName, slug: slugify(compName), status: "OPEN" } });
  }

  console.log(`Clube: ${club.name}  |  Torneio: ${compName}  |  ${dryRun ? "DRY-RUN (sem gravar)" : "A IMPORTAR"}`);
  console.log(`Linhas válidas: ${rows.length}`);
  console.log(comp ? `Torneio ${comp.id} (${comp ? "existente/criado" : ""})` : "Torneio ainda não existe (seria criado).");

  // Categorias necessárias
  const catCodes = [...new Set(rows.map((r) => r.cat.toUpperCase()))].sort();
  const catId = new Map<string, number>();
  for (const code of catCodes) {
    let cat = comp ? await prisma.category.findFirst({ where: { competitionId: comp.id, name: code } }) : null;
    if (!cat && !dryRun && comp) {
      cat = await prisma.category.create({ data: { competitionId: comp.id, name: code, gender: genderOf(code) as never, unit: "PAIR" } });
    }
    if (cat) catId.set(code, cat.id);
  }

  const emailCache = new Map<string, number>();
  let playersCreated = 0, playersReused = 0, teams = 0, entries = 0, skipped = 0;
  const warn: string[] = [];

  async function resolvePlayer(name: string, email?: string, phone?: string, gender?: "MALE" | "FEMALE" | "MIXED") {
    const e = normEmail(email);
    const p = normPhone(phone);
    const g = gender === "MIXED" ? null : gender ?? null;
    if (e && emailCache.has(e)) { playersReused++; return emailCache.get(e)!; }
    if (e) {
      const ex = await prisma.player.findFirst({ where: { email: e } });
      if (ex) { emailCache.set(e, ex.id); playersReused++; return ex.id; }
    }
    if (dryRun) { playersCreated++; return -1; }
    const created = await prisma.player.create({ data: { clubId: club!.id, name: name.trim() || "Jogador", email: e, phone: p, gender: g as never } });
    if (e) emailCache.set(e, created.id);
    playersCreated++;
    return created.id;
  }

  for (const r of rows) {
    const code = r.cat.toUpperCase();
    const cid = catId.get(code);
    if (!normEmail(r.p1e) && !normPhone(r.p1p)) warn.push(`${r.team}: jogador 1 sem email nem telefone`);
    if (!normEmail(r.p2e) && !normPhone(r.p2p)) warn.push(`${r.team}: jogador 2 sem email nem telefone`);

    if (dryRun) {
      await resolvePlayer(r.p1n, r.p1e, r.p1p, genderOf(code));
      if (r.p2n) await resolvePlayer(r.p2n, r.p2e, r.p2p, genderOf(code));
      teams++; entries++;
      continue;
    }
    if (!cid) { warn.push(`${r.team}: categoria ${code} indisponível`); continue; }

    const a = await resolvePlayer(r.p1n, r.p1e, r.p1p, genderOf(code));
    const b = r.p2n ? await resolvePlayer(r.p2n, r.p2e, r.p2p, genderOf(code)) : null;

    // Idempotência: já existe inscrição desta dupla nesta categoria?
    const dup = await prisma.entry.findFirst({
      where: { categoryId: cid, team: b ? { OR: [{ player1Id: a, player2Id: b }, { player1Id: b, player2Id: a }] } : { player1Id: a } },
      select: { id: true },
    });
    if (dup) { skipped++; continue; }

    const team = await prisma.team.create({ data: { name: r.team || null, player1Id: a, player2Id: b } });
    await prisma.entry.create({ data: { categoryId: cid, teamId: team.id, status: "CONFIRMED" } });
    teams++; entries++;
  }

  console.log("\n=== Resumo ===");
  console.log("Categorias:", catCodes.map((c) => `${c}(${rows.filter((r) => r.cat.toUpperCase() === c).length})`).join("  "));
  console.log(`Jogadores: ${playersCreated} ${dryRun ? "a criar" : "criados"}, ${playersReused} reutilizados`);
  console.log(`Duplas: ${teams}  |  Inscrições CONFIRMADAS: ${entries}  |  Ignoradas (já existiam): ${skipped}`);
  if (warn.length) { console.log(`\nAvisos (${warn.length}):`); warn.slice(0, 40).forEach((w) => console.log(" -", w)); if (warn.length > 40) console.log(`   ... +${warn.length - 40}`); }
  if (dryRun) console.log("\nDRY-RUN: nada foi gravado. Corre sem --dry-run para importar.");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
