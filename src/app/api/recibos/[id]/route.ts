import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Serve o comprovativo de transferência de um pagamento — mas SÓ a quem tem direito:
// staff/gestor do clube do pagamento, ou o próprio jogador dono da inscrição. Os recibos são
// documentos bancários; não podem estar acessíveis por URL público/adivinhável (ver /uploads,
// que bloqueia a pasta "recibos"). O ficheiro vive em disco e nunca é servido estaticamente.
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Não autorizado", { status: 401 });

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isFinite(paymentId)) return new Response("Not found", { status: 404 });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      proofUrl: true,
      clubId: true,
      entry: { select: { playerId: true, team: { select: { player1Id: true, player2Id: true } } } },
    },
  });
  if (!payment?.proofUrl) return new Response("Not found", { status: 404 });

  // Autorização: staff/gestor do clube do pagamento OU dono da inscrição (jogador da dupla/individual).
  const staff = await prisma.clubUser.findUnique({ where: { clubId_userId: { clubId: payment.clubId, userId } } });
  let allowed = !!staff;
  if (!allowed && payment.entry) {
    const player = await prisma.player.findUnique({ where: { userId }, select: { id: true } });
    if (player) {
      const owners = [payment.entry.playerId, payment.entry.team?.player1Id, payment.entry.team?.player2Id];
      allowed = owners.includes(player.id);
    }
  }
  if (!allowed) return new Response("Não autorizado", { status: 403 });

  // proofUrl = "/uploads/recibos/<ficheiro>"; lemos só o nome do ficheiro (sem travessia).
  const fname = payment.proofUrl.split("/").pop() ?? "";
  if (!fname || fname.includes("..") || fname.includes("/") || fname.includes("\\")) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(process.cwd(), "public", "uploads", "recibos", fname);
  try {
    const data = await readFile(file);
    const ext = (fname.split(".").pop() || "").toLowerCase();
    const type = TYPES[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
