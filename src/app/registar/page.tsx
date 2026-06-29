import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "Criar conta — PadelZone" };

export default async function RegistarPage({ searchParams }: { searchParams: Promise<{ parceiro?: string; convite?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Criar conta</h1>
      <p className="mt-1 text-sm text-zinc-500">Junta-te ao PadelZone e entra na tua zona.</p>

      <RegisterForm parceiro={sp.parceiro} convite={sp.convite} />

      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tens conta?{" "}
        <Link href="/login" className="font-medium text-brand-purple hover:underline">
          Iniciar sessão
        </Link>
      </p>
    </AuthShell>
  );
}
