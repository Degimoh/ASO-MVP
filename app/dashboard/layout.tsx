import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <DashboardSidebar />
      <main className="min-h-screen flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
