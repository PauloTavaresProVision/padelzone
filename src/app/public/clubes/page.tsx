import Link from "next/link";
import { Building2, MapPin, Trophy, Users } from "lucide-react";
import { getPublicClubs } from "@/server/public";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clubes · PadelZone" };

export default async function PublicClubesPage() {
  const t = await getT();
  const clubs = await getPublicClubs();

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-zinc-900 sm:text-3xl">{t("Clubes")}</h1>
          <p className="mt-1 text-muted">{t("Os clubes de padel que organizam torneios em Angola.")}</p>
        </div>

        {clubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
            {t("Ainda não há clubes.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link key={club.id} href={`/public/clubes/${club.id}`} className="group pz-shadow-card block rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
                  {club.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={club.logoUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <Building2 className="size-6 text-soft" />
                  )}
                </div>

                <p className="mt-3 truncate font-bold text-zinc-900">{club.name}</p>
                {club.city && (
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-4 shrink-0 text-soft" /> {club.city}
                  </p>
                )}

                <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="size-4 shrink-0 text-soft" />
                    {club.competitions} {club.competitions === 1 ? t("torneio") : t("torneios")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4 shrink-0 text-soft" />
                    {club.players} {club.players === 1 ? t("jogador") : t("jogadores")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
