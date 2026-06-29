import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/server/actions/auth";
import { MasterNav } from "@/components/master-nav";

export const dynamic = "force-dynamic";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(user.role === "PLAYER" ? "/inicio" : "/admin");

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/padelzone-logo-trim.png" alt="PadelZone" className="h-8 w-auto" />
            <span className="rounded-md bg-brand-navy px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Master</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-soft"><LogOut className="size-4" /> Sair</button>
            </form>
          </div>
        </div>
        <MasterNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
