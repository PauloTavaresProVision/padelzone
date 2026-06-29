import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Guarda uma imagem enviada em public/uploads/<subdir>/ e devolve o URL público.
// (Storage local — para produção/cloud migra-se depois.)
export async function saveImage(file: unknown, subdir: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("O ficheiro tem de ser uma imagem.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem demasiado grande (máx. 8 MB).");

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${subdir}/${name}`;
}

// Guarda um anexo (imagem ou PDF) e devolve o URL + o nome original.
export async function saveFile(file: unknown, subdir: string): Promise<{ url: string; name: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ok = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!ok) throw new Error("Só são permitidas imagens ou PDF.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Ficheiro demasiado grande (máx. 15 MB).");

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${subdir}/${name}`, name: file.name };
}
