import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/server/clubs";
import { clubAccess } from "@/lib/club-access";
import { ClubAccessNotice } from "@/components/club-access-notice";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminMobileNav } from "@/components/admin-mobile-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/master");

  const club = await getMyClub(user.id);
  if (!club) redirect("/inicio");

  const access = clubAccess(club);
  if (!access.live) return <ClubAccessNotice reason={access.reason!} clubName={club.name} />;

  return (
    <div className="flex min-h-screen bg-app">
      <AdminSidebar clubName={club.name} clubCity={club.city ?? ""} userName={user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden px-4 py-5 pb-24 lg:px-8 lg:py-7 lg:pb-7">{children}</main>
        <AdminMobileNav />
      </div>
    </div>
  );
}
