import { getCurrentUser } from "@/lib/auth";
import { getPlatformSettings } from "@/server/platform";
import { SmtpSettingsForm } from "@/components/smtp-settings-form";
import { WesenderSettingsForm } from "@/components/wesender-settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Definições · Master · PadelZone" };

export default async function MasterDefinicoesPage() {
  const [user, s] = await Promise.all([getCurrentUser(), getPlatformSettings()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Definições da plataforma</h1>
        <p className="mt-1 text-muted">Configura o envio de email usado na recuperação de password e nas notificações.</p>
      </div>

      <SmtpSettingsForm
        settings={{
          smtpHost: s?.smtpHost ?? null,
          smtpPort: s?.smtpPort ?? null,
          smtpSecure: s?.smtpSecure ?? false,
          smtpUser: s?.smtpUser ?? null,
          smtpFromName: s?.smtpFromName ?? null,
          smtpFromEmail: s?.smtpFromEmail ?? null,
          hasPassword: !!s?.smtpPassword,
        }}
        testTo={user?.email ?? ""}
      />

      <WesenderSettingsForm hasKey={!!s?.wesenderApiKey} />
    </div>
  );
}
