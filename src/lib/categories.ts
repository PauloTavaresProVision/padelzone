// Catálogo padrão de categorias com que cada clube novo começa (depois personaliza).
// Em padel são todas a pares; Misto = 1 homem + 1 mulher.
type TemplateSeed = { code: string; label: string; gender: "MALE" | "FEMALE" | "MIXED" };

const levels = ["1", "2", "3", "4", "5"];

export const STANDARD_CATEGORY_TEMPLATES: TemplateSeed[] = [
  ...levels.map((n) => ({ code: `M${n}`, label: `Masculino ${n}`, gender: "MALE" as const })),
  ...levels.map((n) => ({ code: `F${n}`, label: `Feminino ${n}`, gender: "FEMALE" as const })),
  ...levels.map((n) => ({ code: `Mx${n}`, label: `Misto ${n}`, gender: "MIXED" as const })),
];

export const GENDER_LABEL: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIXED: "Misto",
};
