"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveImage } from "@/server/upload";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR"];

export type CompState = { error?: string } | null;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function toDate(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? new Date(s) : null;
}
function toInt(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? parseInt(s, 10) : null;
}
function toDecimal(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}

async function requireClubManager(clubId: number, userId: number) {
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão para gerir este clube.");
}
async function compContext(competitionId: number) {
  const c = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { club: { select: { slug: true } } },
  });
  if (!c) throw new Error("Competição não encontrada.");
  return c;
}

export async function createCompetition(_prev: CompState, formData: FormData): Promise<CompState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada." };
  const clubId = Number(formData.get("clubId"));
  await requireClubManager(clubId, userId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "O nome da competição é obrigatório." };

  let slug = slugify(name) || "competicao";
  if (await prisma.competition.findUnique({ where: { clubId_slug: { clubId, slug } } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const comp = await prisma.competition.create({
    data: {
      clubId,
      name,
      slug,
      status: "DRAFT",
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      applRanked: formData.get("applRanked") === "on",
      applType: (formData.get("applRanked") === "on" && String(formData.get("applType") ?? "").trim()) || null,
    },
  });

  const imageUrl = await saveImage(formData.get("image"), "competitions");
  if (imageUrl) await prisma.competition.update({ where: { id: comp.id }, data: { imageUrl } });

  const templateIds = formData.getAll("templateIds").map((v) => Number(v)).filter((n) => n > 0);
  if (templateIds.length) {
    const templates = await prisma.clubCategory.findMany({ where: { id: { in: templateIds }, clubId } });
    if (templates.length) {
      await prisma.category.createMany({
        data: templates.map((t) => ({ competitionId: comp.id, name: t.code, gender: t.gender, unit: t.unit })),
      });
    }
  }

  redirect(`/admin/torneios/${comp.id}`);
}

export async function updateCompetition(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const c = await compContext(id);
  await requireClubManager(c.clubId, userId);

  await prisma.competition.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      regOpenAt: toDate(formData.get("regOpenAt")),
      regCloseAt: toDate(formData.get("regCloseAt")),
      applRanked: formData.get("applRanked") === "on",
      applType: (formData.get("applRanked") === "on" && String(formData.get("applType") ?? "").trim()) || null,
    },
  });
  const imageUrl = await saveImage(formData.get("image"), "competitions");
  if (imageUrl) await prisma.competition.update({ where: { id }, data: { imageUrl } });
  revalidatePath("/admin", "layout");
}

export async function setCompetitionStatus(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "DRAFT");
  const c = await compContext(id);
  await requireClubManager(c.clubId, userId);
  await prisma.competition.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/admin", "layout");
}

export async function deleteCompetition(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const c = await compContext(id);
  await requireClubManager(c.clubId, userId);
  await prisma.competition.delete({ where: { id } });
  redirect(`/admin/torneios`);
}

export async function addCategoryFromTemplate(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  const clubCategoryId = Number(formData.get("clubCategoryId"));
  const c = await compContext(competitionId);
  await requireClubManager(c.clubId, userId);

  const t = await prisma.clubCategory.findFirst({ where: { id: clubCategoryId, clubId: c.clubId } });
  if (t) {
    await prisma.category.create({
      data: { competitionId, name: t.code, gender: t.gender, unit: t.unit },
    });
  }
  revalidatePath("/admin", "layout");
}

export type CatState = { ok?: boolean; error?: string } | null;

export async function updateCategory(_prev: CatState, formData: FormData): Promise<CatState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada." };
  const categoryId = Number(formData.get("categoryId"));
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { competition: { include: { club: { select: { slug: true } } } } },
  });
  if (!cat) return { error: "Categoria não encontrada." };
  await requireClubManager(cat.competition.clubId, userId);

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      price: toDecimal(formData.get("price")),
      maxEntries: toInt(formData.get("maxEntries")),
      latestStart: String(formData.get("latestStart") ?? "").trim() || null,
    },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function removeCategory(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const categoryId = Number(formData.get("categoryId"));
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { competition: { include: { club: { select: { slug: true } } } } },
  });
  if (!cat) return;
  await requireClubManager(cat.competition.clubId, userId);
  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin", "layout");
}

export async function updateCategoryFormat(_prev: CatState, formData: FormData): Promise<CatState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada." };
  const categoryId = Number(formData.get("categoryId"));
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { competition: { select: { clubId: true } } },
  });
  if (!cat) return { error: "Categoria não encontrada." };
  await requireClubManager(cat.competition.clubId, userId);

  const format = String(formData.get("format") ?? "KNOCKOUT");
  const numGroups = toInt(formData.get("numGroups")) ?? 2;
  const qualifiers = toInt(formData.get("qualifiersPerGroup")) ?? 2;

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      format: format as never,
      numGroups: numGroups < 1 ? 1 : numGroups,
      qualifiersPerGroup: qualifiers < 1 ? 1 : qualifiers,
      useSeeds: formData.get("useSeeds") != null,
    },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
