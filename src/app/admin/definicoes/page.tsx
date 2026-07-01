import { notFound } from "next/navigation";
import { Trash2, Building2, Phone, Users, Globe, Image as ImageIcon, X, Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub, getClub } from "@/server/clubs";
import { updateClub, updateClubNotifications, addMember, updateMemberRole, removeMember, addClubPhoto, removeClubPhoto, cancelInvite } from "@/server/actions/clubs";
import { ClubLogoField } from "@/components/club-logo-field";
import { PageHeader } from "@/components/page-header";
import { SaveButton } from "@/components/save-button";
import { prisma } from "@/lib/prisma";
import { NOTIFY_EVENTS, resolvePrefs } from "@/lib/notify";

export const dynamic = "force-dynamic";

const card = "pz-shadow-card rounded-2xl border border-line bg-surface p-5";
const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-900 focus:border-brand-purple focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-muted";
const primaryBtn = "pz-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95";

const ROLE_LABELS: Record<string, string> = {
  CLUB_OWNER: "Dono",
  DIRECTOR: "Diretor",
  REFEREE: "Juiz-Árbitro",
  STAFF: "Staff",
  PLAYER: "Jogador",
};
const ASSIGNABLE_ROLES = [
  { value: "DIRECTOR", label: "Diretor" },
  { value: "REFEREE", label: "Juiz-Árbitro" },
  { value: "STAFF", label: "Staff" },
  { value: "PLAYER", label: "Jogador" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function SectionHead({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-light text-brand-purple">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <h2 className="text-base font-bold leading-tight text-zinc-900">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default async function AdminDefinicoesPage() {
  const user = await getCurrentUser();
  const my = await getMyClub(user!.id);
  if (!my) notFound();
  const club = await getClub(my.slug);
  if (!club) notFound();
  const notif = await prisma.club.findUnique({ where: { id: club.id }, select: { wesenderApiKey: true, notifyPrefs: true } });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Definições"
        subtitle={`Perfil e definições do ${club.name}.`}
        help={[
          { label: "Perfil do clube", desc: "Logótipo, descrição e contactos (email, telefone, website, morada) do clube." },
          { label: "Membros & permissões", desc: "Quem pode gerir o clube e que função tem: Dono, Diretor, Juiz-Árbitro ou Staff." },
        ]}
      />

      <form action={updateClub} className="space-y-5">
        <input type="hidden" name="clubId" value={club.id} />

        {/* Identidade */}
        <section className={card}>
          <SectionHead icon={Building2} title="Identidade do clube" desc="Logótipo, nome, descrição e cor da marca." />
          <div className="space-y-4">
            <ClubLogoField currentUrl={club.logoUrl} clubName={club.name} />
            <div>
              <label className={label}>Nome do clube</label>
              <input name="name" defaultValue={club.name} required className={field} />
            </div>
            <div>
              <label className={label}>Descrição</label>
              <textarea name="description" defaultValue={club.description ?? ""} rows={3} placeholder="Uma breve apresentação do clube…" className={field} />
            </div>
            <div className="sm:w-64">
              <label className={label}>Cor da marca</label>
              <div className="flex items-center gap-2">
                <input type="color" name="brandColor" defaultValue={club.brandColor ?? "#2f38f2"} className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1" />
                <span className="text-xs text-soft">Cor principal do clube.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contactos */}
        <section className={card}>
          <SectionHead icon={Phone} title="Contactos" desc="Como os jogadores podem chegar ao clube." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Email</label>
              <input type="email" name="email" defaultValue={club.email ?? ""} placeholder="clube@email.com" className={field} />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="phone" defaultValue={club.phone ?? ""} placeholder="+244 …" className={field} />
            </div>
            <div>
              <label className={label}>WhatsApp</label>
              <input name="whatsapp" defaultValue={club.whatsapp ?? ""} placeholder="+244 …" className={field} />
            </div>
            <div>
              <label className={label}>Instagram</label>
              <input name="instagram" defaultValue={club.instagram ?? ""} placeholder="@oteuclube" className={field} />
            </div>
            <div>
              <label className={label}>Website</label>
              <input name="website" defaultValue={club.website ?? ""} placeholder="https://…" className={field} />
            </div>
            <div>
              <label className={label}>Cidade</label>
              <input name="city" defaultValue={club.city ?? ""} placeholder="Ex.: Luanda" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Morada</label>
              <input name="address" defaultValue={club.address ?? ""} placeholder="Rua, nº, bairro…" className={field} />
            </div>
          </div>
        </section>

        {/* Perfil público */}
        <section className={card}>
          <SectionHead icon={Globe} title="Perfil público" desc="O que aparece na página pública do clube." />
          <div className="space-y-4">
            <div>
              <label className={label}>Serviços</label>
              <textarea name="services" defaultValue={club.services ?? ""} rows={2} placeholder="Bar, loja, aulas, aluguer de material…" className={field} />
              <p className="mt-1 text-xs text-soft">Separa por vírgulas; aparecem como etiquetas na página pública.</p>
            </div>
            <div>
              <label className={label}>Localização (link do Google Maps)</label>
              <input name="mapsUrl" defaultValue={club.mapsUrl ?? ""} placeholder="https://maps.app.goo.gl/… ou https://maps.google.com/…" className={field} />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className={primaryBtn}>Guardar alterações</button>
        </div>
      </form>

      {/* Notificações */}
      <section className={card}>
        <SectionHead icon={Bell} title="Notificações" desc="Que avisos enviar e por que canal. Email sai pela conta PadelZone; SMS pela conta WeSender do clube." />
        <form action={updateClubNotifications} className="space-y-4">
          <input type="hidden" name="clubId" value={club.id} />
          <div>
            <label className={label}>Chave WeSender do clube (SMS)</label>
            <input name="wesenderApiKey" defaultValue={notif?.wesenderApiKey ?? ""} placeholder="Deixa vazio para usar a conta da plataforma" className={field} />
            <p className="mt-1 text-xs text-soft">Os SMS saem por esta conta WeSender. Sem chave, usa a da plataforma.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-surface-soft text-xs text-muted">
                <tr>
                  <th className="p-2.5 text-left font-semibold">Evento</th>
                  <th className="p-2.5 text-center font-semibold">Ativar</th>
                  <th className="p-2.5 text-center font-semibold">Email</th>
                  <th className="p-2.5 text-center font-semibold">SMS</th>
                  <th className="p-2.5 text-center font-semibold text-soft">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {NOTIFY_EVENTS.map(({ key, label: evLabel }) => {
                  const p = resolvePrefs(notif?.notifyPrefs, key);
                  return (
                    <tr key={key}>
                      <td className="p-2.5 font-medium text-zinc-900">{evLabel}</td>
                      <td className="p-2.5 text-center"><input type="checkbox" name={`pref_${key}_enabled`} defaultChecked={p.enabled} className="size-4 accent-brand-purple" /></td>
                      <td className="p-2.5 text-center"><input type="checkbox" name={`pref_${key}_email`} defaultChecked={p.email} className="size-4 accent-brand-purple" /></td>
                      <td className="p-2.5 text-center"><input type="checkbox" name={`pref_${key}_sms`} defaultChecked={p.sms} className="size-4 accent-brand-purple" /></td>
                      <td className="p-2.5 text-center"><input type="checkbox" disabled title="Em breve" className="size-4 accent-brand-purple opacity-40" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-soft">WhatsApp fica disponível em breve. Se um evento não estiver ativo, não envia por nenhum canal.</p>
          <div className="flex justify-end">
            <SaveButton className={primaryBtn}>Guardar notificações</SaveButton>
          </div>
        </form>
      </section>

      {/* Fotos do clube */}
      <section className={card}>
        <SectionHead icon={ImageIcon} title="Fotos do clube" desc="Mostra os campos e o ambiente na página pública." />
        {club.photos.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {club.photos.map((url) => (
              <div key={url} className="group relative aspect-video overflow-hidden rounded-xl border border-line bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover" />
                <form action={removeClubPhoto} className="absolute right-1.5 top-1.5">
                  <input type="hidden" name="clubId" value={club.id} />
                  <input type="hidden" name="url" value={url} />
                  <button type="submit" aria-label="Remover foto" className="grid size-7 place-items-center rounded-lg bg-black/50 text-white opacity-0 transition hover:bg-danger group-hover:opacity-100">
                    <X className="size-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <form action={addClubPhoto} className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <input type="hidden" name="clubId" value={club.id} />
          <input type="file" name="photo" accept="image/*" required className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-purple" />
          <button type="submit" className={`${primaryBtn} shrink-0`}>Adicionar foto</button>
        </form>
      </section>

      {/* Membros */}
      <section className={card}>
        <SectionHead icon={Users} title="Membros & permissões" desc="Quem pode gerir o clube e que função tem." />

        <ul className="divide-y divide-line">
          {club.users.map((member) => {
            const isOwner = member.role === "CLUB_OWNER";
            return (
              <li key={member.id} className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-brand-purple">
                    {initials(member.user.name || "?")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{member.user.name}</p>
                    <p className="truncate text-xs text-muted">{member.user.email}</p>
                  </div>
                </div>

                {!isOwner ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <form action={updateMemberRole} className="flex items-center gap-2">
                      <input type="hidden" name="clubId" value={club.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <select name="role" defaultValue={member.role} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted focus:border-brand-purple focus:outline-none">
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft">Guardar</button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <button type="submit" aria-label="Remover membro" className="grid size-9 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-brand-purple">{ROLE_LABELS[member.role] ?? member.role}</span>
                )}
              </li>
            );
          })}
        </ul>

        <form action={addMember} className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <input type="hidden" name="clubId" value={club.id} />
          <input type="email" name="email" required placeholder="email do utilizador" className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-purple focus:outline-none" />
          <select name="role" defaultValue="STAFF" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted focus:border-brand-purple focus:outline-none">
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button type="submit" className={`${primaryBtn} shrink-0`}>Adicionar</button>
        </form>
        {club.invites.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soft">Convites pendentes</p>
            <ul className="space-y-2">
              {club.invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-soft/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{inv.email}</p>
                    <p className="text-xs text-muted">{ROLE_LABELS[inv.role] ?? inv.role} · convite enviado</p>
                  </div>
                  <form action={cancelInvite}>
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <button type="submit" aria-label="Cancelar convite" className="grid size-8 shrink-0 place-items-center rounded-lg text-soft transition hover:bg-danger-bg hover:text-danger"><Trash2 className="size-4" /></button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs text-soft">Se a pessoa ainda não tiver conta, recebe um convite por email com um link para se registar e juntar ao clube.</p>
      </section>
    </div>
  );
}
