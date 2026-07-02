import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Serve os ficheiros carregados (logos, fotos de torneio, anexos) a partir do
// disco (public/uploads/...). Necessario porque o servidor nao serve ficheiros
// adicionados em runtime a pasta public; aqui lemos e devolvemos sempre.
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  // SVG deliberadamente omitido: seria servido inline e pode conter <script> (XSS). Cai para
  // application/octet-stream (descarrega em vez de executar).
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  // Evita travessia de diretorios.
  if (!parts?.length || parts.some((p) => p.includes("..") || p.includes("/") || p.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }
  // Recibos de pagamento são privados: só através da rota autenticada /api/recibos/<id>.
  if (parts[0] === "recibos") return new Response("Not found", { status: 404 });
  const file = path.join(process.cwd(), "public", "uploads", ...parts);
  try {
    const data = await readFile(file);
    const ext = (parts[parts.length - 1].split(".").pop() || "").toLowerCase();
    const type = TYPES[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
