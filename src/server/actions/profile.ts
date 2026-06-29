"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { saveImage } from "@/server/upload";

export type ProfileState = { error?: string; ok?: boolean } | null;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Sessão expirada. Inicia sessão novamente." };

  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const shirtSize = String(formData.get("shirtSize") ?? "").trim();

  if (!name) return { error: "O nome é obrigatório." };

  await prisma.user.update({ where: { id: userId }, data: { name } });

  const photoUrl = await saveImage(formData.get("photo"), "players");
  const data = {
    name,
    bio: bio || null,
    city: city || null,
    phone: phone || null,
    shirtSize: shirtSize || null,
    ...(photoUrl ? { photoUrl } : {}),
  };

  const existing = await prisma.player.findUnique({ where: { userId } });
  if (existing) {
    await prisma.player.update({ where: { userId }, data });
  } else {
    await prisma.player.create({ data: { ...data, userId } });
  }

  revalidatePath("/perfil");
  revalidatePath("/inicio");
  return { ok: true };
}
