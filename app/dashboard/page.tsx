import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">ASO Dashboard</h1>
        <p className="text-sm text-slate-600">
          Create projects, generate optimized copy, and export assets for App Store publishing.
        </p>
      </header>
      <DashboardClient />
    </div>
  );
}
