"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyEmail } from "@/lib/email";

// Só o master (ADMIN) pode gerir clubes na plataforma.
async function requireMaster() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Sem permissão de master.");
  return user;
}

function parseDate(v: FormDataEntryValue | null, endOfDay = false): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return isNaN(d.getTime()) ? null : d;
}

export async function approveClub(formData: FormData) {
  await requireMaster();
  const clubId = Number(formData.get("clubId"));
  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      status: "ACTIVE",
      accessStart: parseDate(formData.get("accessStart")),
      accessEnd: parseDate(formData.get("accessEnd"), true),
      approvedAt: new Date(),
    },
    include: { users: { where: { role: "CLUB_OWNER" }, include: { user: { select: { email: true, name: true } } }, take: 1 } },
  });
  const owner = club.users[0]?.user;
  await notifyEmail(
    owner?.email,
    "O teu clube foi aprovado · PadelZone",
    `<p>Olá ${owner?.name ?? ""},</p><p>O clube <strong>${club.name}</strong> foi aprovado. Já podes iniciar sessão e gerir os teus torneios.</p>`
  );
  revalidatePath("/master");
}

export async function updateClubAccess(formData: FormData) {
  await requireMaster();
  const clubId = Number(formData.get("clubId"));
  await prisma.club.update({
    where: { id: clubId },
    data: {
      accessStart: parseDate(formData.get("accessStart")),
      accessEnd: parseDate(formData.get("accessEnd"), true),
    },
  });
  revalidatePath("/master");
}

export async function suspendClub(formData: FormData) {
  await requireMaster();
  const clubId = Number(formData.get("clubId"));
  await prisma.club.update({ where: { id: clubId }, data: { status: "SUSPENDED" } });
  revalidatePath("/master");
}

export async function reactivateClub(formData: FormData) {
  await requireMaster();
  const clubId = Number(formData.get("clubId"));
  await prisma.club.update({ where: { id: clubId }, data: { status: "ACTIVE" } });
  revalidatePath("/master");
}

export async function markContactHandled(formData: FormData) {
  await requireMaster();
  const id = Number(formData.get("id"));
  const m = await prisma.contactMessage.findUnique({ where: { id } });
  if (m) await prisma.contactMessage.update({ where: { id }, data: { handled: !m.handled } });
  revalidatePath("/master/mensagens");
}

export async function deleteContactMessage(formData: FormData) {
  await requireMaster();
  const id = Number(formData.get("id"));
  await prisma.contactMessage.delete({ where: { id } });
  revalidatePath("/master/mensagens");
}
