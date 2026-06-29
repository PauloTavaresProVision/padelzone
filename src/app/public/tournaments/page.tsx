import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { TournamentsDiscovery } from "@/components/tournaments-discovery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Torneios · PadelZone" };

export default async function PublicTournamentsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; gender?: string; status?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="min-h-screen bg-app">
      <PublicHeader />
      <TournamentsDiscovery q={sp.q ?? ""} city={sp.city ?? ""} gender={sp.gender ?? ""} status={sp.status ?? ""} />
      <PublicFooter />
    </div>
  );
}
