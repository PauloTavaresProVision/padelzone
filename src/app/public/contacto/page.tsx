import Link from "next/link";
import { Mail, Building2, User } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ContactForm } from "@/components/contact-form";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contacto · PadelZone" };

export default async function ContactoPage() {
  const t = await getT();
  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-xl">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{t("Fala connosco")}</h1>
          <p className="mt-3 text-muted sm:text-lg">{t("Tens uma dúvida, queres trazer o teu clube para o PadelZone, ou precisas de ajuda? Escreve-nos.")}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="pz-shadow-card rounded-2xl border border-line bg-surface p-6">
            <ContactForm />
          </div>

          <aside className="space-y-4">
            <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-light text-brand-purple"><Building2 className="size-5" /></span>
              <p className="mt-3 font-bold text-zinc-900">{t("És um clube?")}</p>
              <p className="mt-1 text-sm text-muted">{t("Organiza torneios, inscrições e resultados num só sítio.")}</p>
              <Link href="/registar" className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline">{t("Criar conta de clube")} →</Link>
            </div>
            <div className="pz-shadow-soft rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-light text-brand-purple"><User className="size-5" /></span>
              <p className="mt-3 font-bold text-zinc-900">{t("És jogador?")}</p>
              <p className="mt-1 text-sm text-muted">{t("Cria conta, segue o teu ranking e inscreve-te com a tua dupla.")}</p>
              <Link href="/registar" className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline">{t("Criar conta")} →</Link>
            </div>
            <div className="rounded-2xl border border-line bg-surface-soft/50 p-5">
              <p className="flex items-center gap-2 text-sm text-muted"><Mail className="size-4 text-soft" /> {t("Respondemos por email assim que possível.")}</p>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
