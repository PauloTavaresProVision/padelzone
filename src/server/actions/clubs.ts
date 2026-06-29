"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { STANDARD_CATEGORY_TEMPLATES } from "@/lib/categories";
import { saveImage } from "@/server/upload";
import { notifyEmail } from "@/lib/email";

type ManageableRole = "CLUB_OWNER" | "DIRECTOR" | "REFEREE" | "STAFF";
const MANAGER_ROLES = ["CLUB_OWNER", "DIRECTOR"];

export type ClubState = { error?: string } | null;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireManager(clubId: number, userId: number) {
  const m = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId, userId } } });
  if (!m || !MANAGER_ROLES.includes(m.role)) throw new Error("Sem permissão para gerir este clube.");
  return m;
}

export async function createClub(_prev: ClubState, formData: FormData): Promise<ClubState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada." };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name) return { error: "O nome do clube é obrigatório." };

  let slug = slugify(name) || "clube";
  if (await prisma.club.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const club = await prisma.club.create({
    data: { name, slug, city: city || null, users: { create: { userId, role: "CLUB_OWNER" } } },
  });
  await prisma.clubCategory.createMany({
    data: STANDARD_CATEGORY_TEMPLATES.map((t, i) => ({
      clubId: club.id,
      code: t.code,
      label: t.label,
      gender: t.gender as never,
      order: i,
    })),
  });

  redirect("/admin");
}

export async function updateClub(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const logoUrl = await saveImage(formData.get("logo"), "clubs");
  await prisma.club.update({
    where: { id: clubId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      city: str("city"),
      description: str("description"),
      email: str("email"),
      phone: str("phone"),
      address: str("address"),
      website: str("website"),
      instagram: str("instagram"),
      whatsapp: str("whatsapp"),
      mapsUrl: str("mapsUrl"),
      services: str("services"),
      brandColor: str("brandColor"),
      ...(logoUrl ? { logoUrl } : {}),
    },
  });
  revalidatePath("/admin", "layout");
}

// Galeria de fotos do clube (perfil público).
export async function addClubPhoto(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);
  const url = await saveImage(formData.get("photo"), "clubs");
  if (url) await prisma.club.update({ where: { id: clubId }, data: { photos: { push: url } } });
  revalidatePath("/admin", "layout");
}

export async function removeClubPhoto(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);
  const url = String(formData.get("url") ?? "");
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { photos: true } });
  if (club) await prisma.club.update({ where: { id: clubId }, data: { photos: club.photos.filter((p) => p !== url) } });
  revalidatePath("/admin", "layout");
}

export async function addCourt(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);
  const name = String(formData.get("name") ?? "").trim();
  if (name) await prisma.court.create({ data: { clubId, name } });
  revalidatePath("/admin", "layout");
}

export async function removeCourt(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const courtId = Number(formData.get("courtId"));
  const court = await prisma.court.findUnique({ where: { id: courtId }, include: { club: true } });
  if (!court) return;
  await requireManager(court.clubId, userId);
  await prisma.court.delete({ where: { id: courtId } });
  revalidatePath("/admin", "layout");
}

export async function addMember(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = (String(formData.get("role") ?? "STAFF") as ManageableRole) || "STAFF";
  const target = await prisma.user.findUnique({ where: { email } });

  if (target) {
    await prisma.clubUser.upsert({
      where: { clubId_userId: { clubId, userId: target.id } },
      update: { role },
      create: { clubId, userId: target.id, role },
    });
  } else {
    // Sem conta: cria/atualiza um convite e envia email com o link de registo.
    const token = crypto.randomBytes(24).toString("base64url");
    const existing = await prisma.clubInvite.findFirst({ where: { clubId, email, acceptedAt: null } });
    if (existing) await prisma.clubInvite.update({ where: { id: existing.id }, data: { role, token } });
    else await prisma.clubInvite.create({ data: { clubId, email, role, token } });

    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
    const h = await headers();
    const host = h.get("host") ?? "localhost:3010";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const link = `${proto}://${host}/registar?convite=${token}`;
    await notifyEmail(
      email,
      `Convite para ${club?.name ?? "um clube"} · PadelZone`,
      `<p>Foste convidado(a) para a equipa do clube <strong>${club?.name ?? ""}</strong> no PadelZone.</p><p><a href="${link}">Clica aqui para criares conta e juntares-te</a>.</p>`
    );
  }
  revalidatePath("/admin", "layout");
}

export async function cancelInvite(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const inviteId = Number(formData.get("inviteId"));
  const inv = await prisma.clubInvite.findUnique({ where: { id: inviteId } });
  if (!inv) return;
  await requireManager(inv.clubId, userId);
  await prisma.clubInvite.delete({ where: { id: inviteId } });
  revalidatePath("/admin", "layout");
}

export async function updateMemberRole(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);
  const memberId = Number(formData.get("memberId"));
  const role = String(formData.get("role") ?? "STAFF") as ManageableRole;
  await prisma.clubUser.update({ where: { id: memberId }, data: { role } });
  revalidatePath("/admin", "layout");
}

export async function removeMember(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sessão expirada.");
  const clubId = Number(formData.get("clubId"));
  await requireManager(clubId, userId);
  const memberId = Number(formData.get("memberId"));
  const member = await prisma.clubUser.findUnique({ where: { id: memberId } });
  // Não permitir remover o dono do clube
  if (member && member.role !== "CLUB_OWNER") {
    await prisma.clubUser.delete({ where: { id: memberId } });
  }
  revalidatePath("/admin", "layout");
}
