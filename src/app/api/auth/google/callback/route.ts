import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?erro=google`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${origin}/login?erro=google`);

  const tokens = await tokenRes.json();
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return NextResponse.redirect(`${origin}/login?erro=google`);

  const profile = await infoRes.json();
  const email = String(profile.email ?? "").toLowerCase();
  if (!email) return NextResponse.redirect(`${origin}/login?erro=google`);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const name = profile.name || email.split("@")[0];
    const password = await bcrypt.hash(randomUUID(), 10);
    user = await prisma.user.create({
      data: { email, name, password, role: "PLAYER", player: { create: { name } } },
    });
  }

  await createSession(user.id);
  return NextResponse.redirect(`${origin}/inicio`);
}
