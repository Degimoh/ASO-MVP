import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopHeader } from "@/components/dashboard/top-header";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromSession();

  if (!user) {
    redirect("/login");
  }

  const userLabel = user.name?.trim() || user.email;

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardTopHeader userLabel={userLabel} userBalance={user.walletBalance} />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <DashboardSidebar />
        <main className="min-h-[calc(100vh-4.5rem)] flex-1 p-4 sm:p-6 lg:p-8">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
