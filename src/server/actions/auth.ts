"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, signReset, verifyReset, verifyPlayerInvite } from "@/lib/auth";
import { STANDARD_CATEGORY_TEMPLATES } from "@/lib/categories";
import { isEmailConfigured, sendMail } from "@/lib/email";
import { getMyClub } from "@/server/clubs";

export type AuthState = { error?: string } | null;
export type ResetRequestState = { error?: string; ok?: boolean; devLink?: string } | null;

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
async function postLoginHome(user: { id: number; role: string }) {
  if (user.role === "ADMIN") return "/master";
  // Membros de staff de um clube (Dono/Diretor/Staff/Juiz) vão para o /admin,
  // mesmo que o papel global seja PLAYER.
  if (await getMyClub(user.id)) return "/admin";
  return "/inicio";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preenche o email e a palavra-passe." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Email ou palavra-passe incorretos." };
  }
  await createSession(user.id);
  redirect(await postLoginHome(user));
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const type = String(formData.get("type") ?? "player"); // "player" | "organizer"

  if (!name || !email || !password) return { error: "Preenche todos os campos." };
  if (!isEmail(email)) return { error: "Email inválido." };
  if (password.length < 6) return { error: "A palavra-passe precisa de pelo menos 6 caracteres." };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Já existe uma conta com este email." };

  const hash = await bcrypt.hash(password, 10);

  if (type === "organizer") {
    const clubName = String(formData.get("clubName") ?? "").trim();
    if (!clubName) return { error: "Indica o nome do clube." };

    let slug = slugify(clubName) || "clube";
    if (await prisma.club.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const user = await prisma.user.create({
      data: { name, email, password: hash, role: "CLUB_OWNER" },
    });
    const club = await prisma.club.create({
      data: { name: clubName, slug, users: { create: { userId: user.id, role: "CLUB_OWNER" } } },
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

    await createSession(user.id);
    redirect("/admin");
  }

  // Convite de dupla: ligar a um Player já inscrito (não registado) em vez de criar um novo.
  const invitePlayerId = verifyPlayerInvite(String(formData.get("parceiro") ?? ""));
  let user = null as Awaited<ReturnType<typeof prisma.user.create>> | null;
  if (invitePlayerId) {
    const p = await prisma.player.findUnique({ where: { id: invitePlayerId } });
    if (p && !p.userId) {
      user = await prisma.user.create({ data: { name, email, password: hash, role: "PLAYER" } });
      await prisma.player.update({ where: { id: p.id }, data: { userId: user.id, email, name, invitePending: false } });
    }
  }
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, password: hash, role: "PLAYER", player: { create: { name } } },
    });
  }
  // Convite de clube (membro): juntar ao clube com o papel do convite.
  const conviteToken = String(formData.get("convite") ?? "").trim();
  if (conviteToken) {
    const inv = await prisma.clubInvite.findUnique({ where: { token: conviteToken } });
    if (inv && !inv.acceptedAt) {
      await prisma.clubUser.upsert({
        where: { clubId_userId: { clubId: inv.clubId, userId: user.id } },
        update: { role: inv.role },
        create: { clubId: inv.clubId, userId: user.id, role: inv.role },
      });
      await prisma.clubInvite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    }
  }

  await createSession(user.id);
  redirect(await postLoginHome(user));
}

export async function requestReset(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Email inválido." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Não revelamos se a conta existe.
  if (!user) return { ok: true };

  const token = signReset(user.id);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3010";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const link = `${proto}://${host}/recuperar/${token}`;

  // Com SMTP configurado, envia por email. Sem SMTP (dev), devolve o link.
  if (await isEmailConfigured()) {
    try {
      await sendMail({
        to: email,
        subject: "Recuperar palavra-passe · PadelZone",
        html: `<p>Recebemos um pedido para repores a tua palavra-passe no PadelZone.</p>
<p><a href="${link}">Clica aqui para definir uma nova palavra-passe</a>.</p>
<p>Se não foste tu, ignora este email.</p>`,
      });
      return { ok: true };
    } catch {
      return { ok: true, devLink: link };
    }
  }
  return { ok: true, devLink: link };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "A palavra-passe precisa de pelo menos 6 caracteres." };

  const userId = verifyReset(token);
  if (!userId) return { error: "Link inválido ou expirado. Pede um novo." };

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
    select: { role: true },
  });
  await createSession(userId);
  redirect(await postLoginHome({ id: userId, role: user.role }));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
