import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/reset-form";

export const metadata = { title: "Nova palavra-passe — PadelZone" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Nova palavra-passe</h1>
      <p className="mt-1 text-sm text-zinc-500">Define a tua nova palavra-passe para entrares de novo.</p>
      <ResetForm token={token} />
    </AuthShell>
  );
}
