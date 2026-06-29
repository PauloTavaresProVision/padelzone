"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveImage } from "@/server/upload";

async function requireMaster() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Sem permissão de master.");
  return user;
}

function refresh() {
  revalidatePath("/master/patrocinadores");
  revalidatePath("/public");
  revalidatePath("/public/tournaments");
}

export async function addSponsor(formData: FormData) {
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const logoUrl = await saveImage(formData.get("logo"), "sponsors");
  if (!name || !logoUrl) return; // nome + logótipo obrigatórios
  const max = await prisma.sponsor.aggregate({ _max: { order: true } });
  await prisma.sponsor.create({ data: { name, url, logoUrl, order: (max._max.order ?? 0) + 1 } });
  refresh();
}

export async function toggleSponsor(formData: FormData) {
  await requireMaster();
  const id = Number(formData.get("id"));
  const s = await prisma.sponsor.findUnique({ where: { id } });
  if (s) await prisma.sponsor.update({ where: { id }, data: { active: !s.active } });
  refresh();
}

export async function removeSponsor(formData: FormData) {
  await requireMaster();
  const id = Number(formData.get("id"));
  await prisma.sponsor.delete({ where: { id } });
  refresh();
}
