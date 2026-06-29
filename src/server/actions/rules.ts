"use server";

import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveImage, saveFile } from "@/server/upload";

const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR", "STAFF"];

async function requireCompManager(competitionId: number, userId: number) {
  const c = await prisma.competition.findUnique({ where: { id: competitionId }, select: { clubId: true } });
  if (!c) throw new Error("Torneio não encontrado.");
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: c.clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão.");
  return c;
}

// Conteúdo do regulamento é escrito pelo clube (semi-fiável), mas sanitizamos sempre.
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "img", "hr", "div", "span"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
};

export async function updateRules(competitionId: number, html: string) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  await requireCompManager(competitionId, userId);
  const clean = sanitizeHtml(html ?? "", SANITIZE).trim();
  await prisma.competition.update({ where: { id: competitionId }, data: { rules: clean || null } });
  revalidatePath("/admin", "layout");
  revalidatePath(`/public/tournaments/${competitionId}`);
}

export async function uploadRuleImage(formData: FormData): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  await requireCompManager(competitionId, userId);
  return saveImage(formData.get("image"), "rules");
}

export async function addAttachment(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const competitionId = Number(formData.get("competitionId"));
  await requireCompManager(competitionId, userId);
  const saved = await saveFile(formData.get("file"), "attachments");
  if (saved) await prisma.competitionAttachment.create({ data: { competitionId, name: saved.name, url: saved.url } });
  revalidatePath("/admin", "layout");
  revalidatePath(`/public/tournaments/${competitionId}`);
}

export async function removeAttachment(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const id = Number(formData.get("id"));
  const att = await prisma.competitionAttachment.findUnique({ where: { id } });
  if (!att) return;
  await requireCompManager(att.competitionId, userId);
  await prisma.competitionAttachment.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  revalidatePath(`/public/tournaments/${att.competitionId}`);
}
