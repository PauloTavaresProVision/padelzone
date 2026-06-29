import Link from "next/link";
import { getT } from "@/lib/i18n-server";

// Rodapé de marca das páginas públicas.
export async function PublicFooter() {
  const t = await getT();
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-7 w-auto" />
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("A plataforma para organizar e seguir torneios de padel em Angola.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-soft">{t("Explorar")}</p>
              <Link href="/public/tournaments" className="block text-muted transition hover:text-zinc-900">{t("Torneios")}</Link>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-soft">{t("Conta")}</p>
              <Link href="/login" className="block text-muted transition hover:text-zinc-900">{t("Entrar")}</Link>
              <Link href="/registar" className="block text-muted transition hover:text-zinc-900">{t("Criar conta")}</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-line pt-6 text-xs text-soft">{t("© 2026 PadelZone · Feito para o padel angolano.")}</p>
      </div>
    </footer>
  );
}
