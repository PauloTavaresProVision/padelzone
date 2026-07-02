import "server-only";
import { prisma } from "@/lib/prisma";

// Vagas ocupadas numa categoria: inscrições CONFIRMED + reservas (PENDING) ainda válidas.
// Se o torneio tiver prazo de reserva (holdHours), as PENDING expiradas NÃO contam — libertam
// a vaga para outros. Usada tanto no registo como no pagamento, para que a contagem seja a mesma
// nos dois caminhos (senão a lotação fica inconsistente).
export async function occupiedCount(categoryId: number, holdHours: number | null, excludeEntryId?: number) {
  const cutoff = holdHours ? new Date(Date.now() - holdHours * 3600000) : null;
  return prisma.entry.count({
    where: {
      categoryId,
      ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", ...(cutoff ? { createdAt: { gte: cutoff } } : {}) },
      ],
    },
  });
}
