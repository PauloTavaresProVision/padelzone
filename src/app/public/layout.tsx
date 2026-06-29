import { getLocale } from "@/lib/i18n-server";
import { I18nProvider } from "@/components/i18n-provider";

// Fornece o idioma escolhido aos componentes de cliente da área pública.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
