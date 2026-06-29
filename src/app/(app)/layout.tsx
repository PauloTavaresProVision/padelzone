import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadMessageCount } from "@/server/messages";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PLAYER") redirect("/admin");

  const unread = await getUnreadMessageCount(user.id);

  return (
    <div className="flex min-h-screen bg-app">
      <AppSidebar unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={user} unread={unread} />
        <main className="flex-1 overflow-x-hidden p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
        <MobileNav unread={unread} />
      </div>
    </div>
  );
}
