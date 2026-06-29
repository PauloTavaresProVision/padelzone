import { ShieldAlert, LogOut } from "lucide-react";
import { ACCESS_NOTICE, type AccessReason } from "@/lib/club-access";
import { logout } from "@/server/actions/auth";

// Mostrado ao dono de um clube que ainda não pode usar a plataforma
// (por aprovar, suspenso, fora da janela de datas).
export function ClubAccessNotice({ reason, clubName }: { reason: Exclude<AccessReason, null>; clubName: string }) {
  const n = ACCESS_NOTICE[reason];
  return (
    <div className="grid min-h-screen place-items-center bg-app px-4">
      <div className="pz-shadow-card w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-bg text-warning"><ShieldAlert className="size-7" /></span>
        <h1 className="mt-4 text-xl font-bold text-zinc-900">{n.title}</h1>
        <p className="mt-1 text-sm font-medium text-muted">{clubName}</p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{n.body}</p>
        <form action={logout} className="mt-6">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-soft"><LogOut className="size-4" /> Terminar sessão</button>
        </form>
      </div>
    </div>
  );
}
