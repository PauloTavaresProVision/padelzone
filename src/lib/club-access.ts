// Decide se um clube pode usar a plataforma (aprovação + janela de acesso).
// Gerido pelo master/ADMIN no backoffice da plataforma.

export type ClubAccessInput = {
  status: string;
  accessStart: Date | null;
  accessEnd: Date | null;
};

export type AccessReason = "PENDING" | "SUSPENDED" | "NOT_STARTED" | "EXPIRED" | null;

export function clubAccess(club: ClubAccessInput, now: Date = new Date()): { live: boolean; reason: AccessReason } {
  if (club.status === "SUSPENDED") return { live: false, reason: "SUSPENDED" };
  if (club.status === "PENDING") return { live: false, reason: "PENDING" };
  // ACTIVE: validar a janela de acesso
  if (club.accessStart && now < club.accessStart) return { live: false, reason: "NOT_STARTED" };
  if (club.accessEnd && now > club.accessEnd) return { live: false, reason: "EXPIRED" };
  return { live: true, reason: null };
}

export const ACCESS_NOTICE: Record<Exclude<AccessReason, null>, { title: string; body: string }> = {
  PENDING: {
    title: "Clube por aprovar",
    body: "A tua conta de clube foi criada e está a aguardar aprovação da plataforma. Avisamos-te assim que for ativada.",
  },
  SUSPENDED: {
    title: "Clube suspenso",
    body: "O acesso deste clube está suspenso. Contacta a plataforma para mais informações.",
  },
  NOT_STARTED: {
    title: "Acesso ainda não começou",
    body: "O período de utilização do teu clube ainda não começou. Volta na data de início definida pela plataforma.",
  },
  EXPIRED: {
    title: "Período de acesso terminado",
    body: "O período de utilização do teu clube terminou. Contacta a plataforma para renovar o acesso.",
  },
};

export const CLUB_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
};
