import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "pz_session";
// Em produção o segredo TEM de vir do ambiente e ser forte — senão qualquer pessoa que conheça
// o valor por omissão podia forjar cookies de sessão (e tokens de reposição/convite). Falha já
// no arranque em vez de correr com uma chave insegura conhecida.
if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16)) {
  throw new Error("AUTH_SECRET em falta ou demasiado fraca em produção (define uma chave com pelo menos 16 caracteres).");
}
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

function hmac(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(value: string) {
  return `${value}.${hmac(value)}`;
}

function unsign(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const value = token.slice(0, i);
  const sig = token.slice(i + 1);
  return safeEqual(sig, hmac(value)) ? value : null;
}

export async function createSession(userId: number) {
  const jar = await cookies();
  jar.set(COOKIE, sign(String(userId)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const value = unsign(token);
  return value ? Number(value) : null;
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
}

// ---- Reposição de palavra-passe (token assinado, sem necessidade de BD) ----
const RESET_TTL = 30 * 60 * 1000; // 30 min

export function signReset(userId: number): string {
  const payload = `${userId}.${Date.now() + RESET_TTL}`;
  const raw = `${payload}.${hmac("reset:" + payload)}`;
  return Buffer.from(raw).toString("base64url");
}

export function verifyReset(token: string): number | null {
  try {
    const raw = Buffer.from(token, "base64url").toString();
    const i = raw.lastIndexOf(".");
    const payload = raw.slice(0, i);
    const sig = raw.slice(i + 1);
    if (!safeEqual(sig, hmac("reset:" + payload))) return null;
    const [uid, expMs] = payload.split(".");
    if (Date.now() > Number(expMs)) return null;
    return Number(uid);
  } catch {
    return null;
  }
}

// ---- Convite de dupla (liga um registo novo a um Player já inscrito) ----
const INVITE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function signPlayerInvite(playerId: number): string {
  const payload = `${playerId}.${Date.now() + INVITE_TTL}`;
  const raw = `${payload}.${hmac("pinv:" + payload)}`;
  return Buffer.from(raw).toString("base64url");
}

export function verifyPlayerInvite(token: string): number | null {
  try {
    const raw = Buffer.from(token, "base64url").toString();
    const i = raw.lastIndexOf(".");
    const payload = raw.slice(0, i);
    const sig = raw.slice(i + 1);
    if (!safeEqual(sig, hmac("pinv:" + payload))) return null;
    const [pid, expMs] = payload.split(".");
    if (Date.now() > Number(expMs)) return null;
    return Number(pid);
  } catch {
    return null;
  }
}
