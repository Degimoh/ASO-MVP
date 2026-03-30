"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { dashboardNavItems } from "@/components/dashboard/navigation";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-lime-200/80 bg-white/80 p-4 backdrop-blur-md lg:h-[calc(100vh-4.5rem)] lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-100/90 to-emerald-100/90 px-3 py-2.5">
        <Sparkles className="h-5 w-5 text-lime-700" />
        <span className="font-semibold text-slate-900">AI ASO Generator</span>
      </div>

      <nav className="space-y-2">
        {dashboardNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "border border-lime-300/80 bg-lime-100 text-lime-900 shadow-[0_12px_28px_-22px_rgba(101,163,13,0.6)]"
                  : "text-slate-700 hover:bg-lime-50 hover:text-lime-900 hover:shadow-sm",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card className="mt-6 hidden border-dashed bg-gradient-to-br from-white to-lime-50/50 p-4 lg:block">
        <p className="text-xs text-slate-600">
          Build, generate, export and iterate your ASO assets from one polished workspace.
        </p>
      </Card>
    </aside>
  );
}
