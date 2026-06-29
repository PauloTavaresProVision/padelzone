import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LANG_COOKIE, type Locale, translate } from "./i18n";

// Lê o idioma escolhido (cookie) no servidor.
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return c.get(LANG_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
}

// Tradutor para componentes de servidor: const t = await getT(); t("Torneios").
export async function getT(): Promise<(s: string) => string> {
  const locale = await getLocale();
  return (s: string) => translate(locale, s);
}
