"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR"];

async function requireManager(clubId: number, userId: number) {
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");
}
export async function addClubCategory(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);

  const code = String(formData.get("code") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const gender = String(formData.get("gender") ?? "MALE");
  if (!code || !label) return;

  const dup = await prisma.clubCategory.findUnique({ where: { clubId_code: { clubId, code } } });
  if (dup) return;

  const last = await prisma.clubCategory.findFirst({ where: { clubId }, orderBy: { order: "desc" } });
  await prisma.clubCategory.create({
    data: { clubId, code, label, gender: gender as never, order: (last?.order ?? 0) + 1 },
  });
  revalidatePath("/admin", "layout");
}

export async function updateClubCategory(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const cc = await prisma.clubCategory.findUnique({ where: { id } });
  if (!cc) return;
  await requireManager(cc.clubId, userId);

  await prisma.clubCategory.update({
    where: { id },
    data: {
      label: String(formData.get("label") ?? cc.label).trim() || cc.label,
      gender: String(formData.get("gender") ?? cc.gender) as never,
    },
  });
  revalidatePath("/admin", "layout");
}

export async function removeClubCategory(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const cc = await prisma.clubCategory.findUnique({ where: { id } });
  if (!cc) return;
  await requireManager(cc.clubId, userId);
  await prisma.clubCategory.delete({ where: { id } });
  revalidatePath("/admin", "layout");
}
