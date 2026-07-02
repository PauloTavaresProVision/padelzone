import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Verifica os "magic bytes" reais do ficheiro — não confiamos no tipo declarado pelo cliente
// (é facilmente forjável). Devolve a extensão detetada ou null se não for um tipo reconhecido.
// (SVG é deliberadamente NÃO reconhecido: pode conter <script> e seria um vetor de XSS.)
function sniffExt(buf: Buffer): string | null {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif"; // GIF8
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "webp"; // RIFF....WEBP
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.subarray(8, 12).toString("ascii"); // ....ftyp<brand>
    if (brand === "avif" || brand === "avis") return "avif";
  }
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf"; // %PDF
  return null;
}

const IMAGE_EXTS = new Set(["png", "jpg", "gif", "webp", "avif"]);

// Guarda uma imagem enviada em public/uploads/<subdir>/ e devolve o URL público.
// (Storage local — para produção/cloud migra-se depois.)
export async function saveImage(file: unknown, subdir: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") throw new Error("O ficheiro tem de ser uma imagem (SVG não é permitido).");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem demasiado grande (máx. 8 MB).");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniffExt(buf);
  if (!ext || !IMAGE_EXTS.has(ext)) throw new Error("Imagem inválida ou em formato não suportado.");
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${subdir}/${name}`;
}

// Guarda um anexo (imagem ou PDF) e devolve o URL + o nome original.
export async function saveFile(file: unknown, subdir: string): Promise<{ url: string; name: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.type === "image/svg+xml") throw new Error("SVG não é permitido.");
  const declaredOk = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!declaredOk) throw new Error("Só são permitidas imagens ou PDF.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Ficheiro demasiado grande (máx. 15 MB).");

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniffExt(buf); // imagem OU pdf
  if (!ext) throw new Error("Ficheiro inválido ou em formato não suportado (imagem ou PDF).");
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${subdir}/${name}`, name: file.name };
}
