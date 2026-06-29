import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Iniciar sessão — PadelZone" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Iniciar sessão</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Bem-vindo de volta! Inicia sessão para continuares a evoluir.
      </p>

      {erro === "google" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40">
          O início de sessão com Google ainda não está configurado.
        </p>
      )}

      <LoginForm />

      <p className="mt-4 text-center text-sm text-zinc-500">
        Ainda não tens conta?{" "}
        <Link href="/registar" className="font-medium text-brand-purple hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
