import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RecuperarForm } from "@/components/recuperar-form";

export const metadata = { title: "Recuperar palavra-passe — PadelZone" };

export default function RecuperarPage() {
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Recuperar palavra-passe</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Indica o teu email e enviamos instruções para repores a palavra-passe.
      </p>

      <RecuperarForm />

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-brand-purple hover:underline">
          Voltar ao início de sessão
        </Link>
      </p>
    </AuthShell>
  );
}
