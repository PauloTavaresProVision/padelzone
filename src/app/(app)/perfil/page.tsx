import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perfil · PadelZone" };

export default async function PerfilPage() {
  const user = await getCurrentUser();
  const player = user ? await prisma.player.findUnique({ where: { userId: user.id } }) : null;

  const initial = {
    name: user?.name ?? "",
    bio: player?.bio ?? "",
    city: player?.city ?? "",
    phone: player?.phone ?? "",
    shirtSize: player?.shirtSize ?? "",
    photoUrl: player?.photoUrl ?? null,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-zinc-900">O meu perfil</h1>
        <p className="mt-1 text-sm text-muted">{user?.email}</p>
      </div>

      <div className="pz-shadow-card rounded-2xl border border-line bg-surface p-6">
        <ProfileForm initial={initial} />
      </div>
    </div>
  );
}
