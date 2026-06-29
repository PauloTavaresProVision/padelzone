"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "./i18n-provider";
import { LANG_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

export function LangSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();

  const set = (l: Locale) => {
    if (l === locale) return;
    document.cookie = `${LANG_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };

  return (
    <div className={`flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={locale === l}
          className={`rounded-md px-2 py-1 text-xs font-bold uppercase transition ${
            locale === l ? "bg-primary-light text-brand-purple" : "text-soft hover:text-zinc-900"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
