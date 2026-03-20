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
    <div className="min-h-screen bg-slate-50">
      <DashboardTopHeader userLabel={userLabel} userBalance={user.walletBalance} />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <DashboardSidebar />
        <main className="min-h-[calc(100vh-4.5rem)] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
