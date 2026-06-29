import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin, Mail, Phone, Globe, AtSign, MessageCircle, Trophy, LayoutGrid, CalendarClock, ArrowRight, ExternalLink,
} from "lucide-react";
import { getPublicClub } from "@/server/public";
import { getT } from "@/lib/i18n-server";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ClubGallery } from "@/components/club-gallery";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Inscrições abertas", cls: "bg-success-bg text-success" },
  ONGOING: { label: "Em curso", cls: "bg-primary-light text-brand-purple" },
  FINISHED: { label: "Terminado", cls: "bg-surface-soft text-muted" },
};
const dateFmt = new Intl.DateTimeFormat("pt-PT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
function fmtRange(a: Date | null, b: Date | null) {
  if (!a) return "Datas a anunciar";
  return b ? `${dateFmt.format(a)} – ${dateFmt.format(b)}` : dateFmt.format(a);
}

export default async function PublicClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const club = await getPublicClub(Number(id));
  if (!club) notFound();

  const photos = club.photos ?? [];
  const cover = photos[0] ?? null;
  const services = (club.services ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const igUrl = club.instagram ? (club.instagram.startsWith("http") ? club.instagram : `https://instagram.com/${club.instagram.replace(/^@/, "")}`) : null;
  const igLabel = club.instagram ? (club.instagram.startsWith("http") ? club.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "") : club.instagram.startsWith("@") ? club.instagram : `@${club.instagram}`) : null;
  const waUrl = club.whatsapp ? `https://wa.me/${club.whatsapp.replace(/\D/g, "")}` : null;

  const Contact = ({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }) => {
    const inner = (
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple"><Icon className="size-[18px]" /></span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-soft">{label}</p>
          <p className="truncate text-sm font-medium text-zinc-900">{value}</p>
        </div>
      </div>
    );
    return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-xl p-1 transition hover:bg-surface-soft">{inner}</a> : <div className="p-1">{inner}</div>;
  };

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />

      {/* Banner */}
      <div className="relative h-44 overflow-hidden sm:h-60">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/40 to-brand-navy/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-purple" />
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Cabeçalho do clube (sobrepõe o banner) */}
        <div className="relative z-10 -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-surface bg-surface shadow-lg sm:size-28">
              {club.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.logoUrl} alt={club.name} className="size-full object-contain p-2" />
              ) : <Trophy className="size-10 text-soft" />}
            </span>
            <div className="pb-1">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">{club.name}</h1>
              {club.city && <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4 text-soft" /> {club.city}{club.address ? ` · ${club.address}` : ""}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft"><MessageCircle className="size-4 text-success" /> WhatsApp</a>}
            {igUrl && <a href={igUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-surface-soft"><AtSign className="size-4 text-brand-purple" /> Instagram</a>}
            {club.mapsUrl && <a href={club.mapsUrl} target="_blank" rel="noopener noreferrer" className="pz-gradient inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-95"><MapPin className="size-4" /> {t("Ver no mapa")}</a>}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 pb-12 lg:grid-cols-[1fr_320px]">
          {/* Coluna principal */}
          <div className="min-w-0 space-y-6">
            {(club.description || services.length > 0) && (
              <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                <h2 className="mb-2 font-bold text-zinc-900">{t("Sobre o clube")}</h2>
                {club.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{club.description}</p>}
                {services.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${club.description ? "mt-4 border-t border-line pt-4" : "mt-1"}`}>
                    {services.map((s) => <span key={s} className="rounded-lg bg-surface-soft px-2.5 py-1 text-xs font-medium text-zinc-700">{s}</span>)}
                  </div>
                )}
              </section>
            )}

            <ClubGallery photos={photos} />

            <section>
              <h2 className="mb-3 font-bold text-zinc-900">{t("Torneios do clube")}</h2>
              {club.competitions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">{t("Este clube ainda não tem torneios públicos.")}</p>
              ) : (
                <div className="space-y-2.5">
                  {club.competitions.map((c) => {
                    const st = STATUS[c.status] ?? STATUS.FINISHED;
                    return (
                      <Link key={c.id} href={`/public/tournaments/${c.id}`} className="pz-shadow-soft flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-purple/40">
                        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-light text-brand-purple">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.imageUrl} alt="" className="size-full object-cover" />
                          ) : <Trophy className="size-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-zinc-900">{c.name}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-3.5 text-soft" /> {c.startDate ? fmtRange(c.startDate, c.endDate) : t("Datas a anunciar")} · {c._count.categories} {t("categorias")}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{t(st.label)}</span>
                        <ArrowRight className="size-4 shrink-0 text-soft" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Barra lateral */}
          <aside className="space-y-5">
            <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-soft">{t("Contactos")}</h3>
              <div className="space-y-1">
                {club.email && <Contact icon={Mail} label={t("Email")} value={club.email} href={`mailto:${club.email}`} />}
                {club.phone && <Contact icon={Phone} label={t("Telefone")} value={club.phone} href={`tel:${club.phone.replace(/\s/g, "")}`} />}
                {waUrl && <Contact icon={MessageCircle} label="WhatsApp" value={club.whatsapp!} href={waUrl} />}
                {igUrl && igLabel && <Contact icon={AtSign} label="Instagram" value={igLabel} href={igUrl} />}
                {club.website && <Contact icon={Globe} label={t("Website")} value={club.website.replace(/^https?:\/\//, "")} href={club.website} />}
                {!club.email && !club.phone && !waUrl && !igUrl && !club.website && <p className="p-1 text-sm text-muted">{t("Sem contactos disponíveis.")}</p>}
              </div>
            </section>

            <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-soft"><LayoutGrid className="size-4 text-soft" /> {t("Campos")} ({club.courts.length})</h3>
              {club.courts.length === 0 ? (
                <p className="text-sm text-muted">{t("Sem campos registados.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {club.courts.map((ct) => <span key={ct.id} className="rounded-lg bg-surface-soft px-2.5 py-1 text-xs font-medium text-zinc-700">{ct.name}</span>)}
                </div>
              )}
            </section>

            {(club.mapsUrl || club.address) && (
              <section className="pz-shadow-card rounded-2xl border border-line bg-surface p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-soft"><MapPin className="size-4 text-soft" /> {t("Localização")}</h3>
                {club.address && <p className="text-sm text-zinc-700">{club.address}{club.city ? `, ${club.city}` : ""}</p>}
                {club.mapsUrl && (
                  <a href={club.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-brand-purple transition hover:bg-surface-soft"><ExternalLink className="size-4" /> {t("Abrir no Google Maps")}</a>
                )}
              </section>
            )}
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
