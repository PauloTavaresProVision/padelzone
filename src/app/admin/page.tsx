export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Tags, Users, Plus, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { prisma } from "@/lib/prisma";
import { HelpButton } from "@/components/help-button";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Rascunho", cls: "bg-surface-soft text-muted" },
  OPEN: { label: "Inscrições abertas", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-success-bg text-success" },
  FINISHED: { label: "Terminada", cls: "bg-surface-soft text-muted" },
  CANCELLED: { label: "Cancelada", cls: "bg-danger-bg text-danger" },
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const club = await getMyClub(user!.id);
  if (!club) notFound();

  const comps = await prisma.competition.findMany({ where: { clubId: club.id }, orderBy: { createdAt: "desc" } });
  const [categoriesCount, entriesCount] = await Promise.all([
    prisma.clubCategory.count({ where: { clubId: club.id } }),
    prisma.entry.count({ where: { category: { competition: { clubId: club.id } } } }),
  ]);
  const upcoming = comps.filter((c) => c.status === "OPEN" || c.status === "ONGOING").slice(0, 5);

  const stats = [
    { icon: Trophy, label: "Torneios", value: comps.length },
    { icon: Tags, label: "Categorias", value: categoriesCount },
    { icon: Users, label: "Inscrições", value: entriesCount },
  ];
  const quickActions = [
    { href: "/admin/torneios", label: "Novo torneio", icon: Trophy },
    { href: "/admin/categorias", label: "Catálogo de categorias", icon: Tags },
    { href: "/admin/jogadores", label: "Jogadores", icon: Users },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-zinc-900">Painel</h1>
            <p className="mt-1 text-sm text-muted">{club.name}</p>
          </div>
          <HelpButton title="Ajuda: Painel" items={[{ label: "Painel do clube", desc: "Resumo do clube: torneios, categorias e inscrições. Usa o menu à esquerda para gerir cada área." }]} />
        </div>
        <Link href="/admin/torneios" className="pz-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">
          <Plus className="size-4" /> Novo torneio
        </Link>
      </div>

      {/* Números reais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="pz-shadow-soft rounded-2xl border border-line bg-surface p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-light text-brand-purple">
              <Icon className="size-5" />
            </span>
            <p className="mt-3 text-3xl font-bold leading-none text-zinc-900">{value}</p>
            <p className="mt-1.5 text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximos torneios */}
      <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-bold text-zinc-900">Próximos torneios</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center">
            <p className="text-sm text-muted">Ainda não tens torneios em curso.</p>
            <Link href="/admin/torneios" className="pz-gradient mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white">
              <Plus className="size-4" /> Criar torneio
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((c) => {
              const st = STATUS[c.status] ?? STATUS.DRAFT;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/torneios/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition hover:border-brand-purple/40 hover:bg-surface-soft"
                  >
                    <span className="flex min-w-0 items-center gap-2.5 font-semibold text-zinc-900">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-light text-brand-purple">
                        <Trophy className="size-4" />
                      </span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Ações rápidas */}
      <section>
        <h2 className="mb-4 text-base font-bold text-zinc-900">Ações rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="pz-shadow-soft flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-purple/40 hover:bg-surface-soft"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{label}</span>
              <ArrowRight className="size-4 shrink-0 text-soft" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
