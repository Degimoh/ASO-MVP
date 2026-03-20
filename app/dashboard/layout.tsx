import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopHeader } from "@/components/dashboard/top-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardTopHeader />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <DashboardSidebar />
        <main className="min-h-[calc(100vh-4.5rem)] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
