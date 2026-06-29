"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale, translate } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// Tradutor para componentes de cliente: const t = useT(); t("Torneios").
export function useT(): (s: string) => string {
  const locale = useContext(LocaleContext);
  return (s: string) => translate(locale, s);
}
