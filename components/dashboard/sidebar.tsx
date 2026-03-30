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
    <aside className="w-full border-b border-slate-200/70 bg-white/70 p-4 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/50 lg:h-[calc(100vh-4.5rem)] lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-3 py-2.5 dark:from-indigo-500/20 dark:to-fuchsia-500/20">
        <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">AI ASO Generator</span>
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
                  ? "bg-slate-900 text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)] dark:bg-indigo-500/20 dark:text-indigo-100 dark:shadow-none"
                  : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-slate-100 dark:hover:shadow-none",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card className="mt-6 hidden border-dashed bg-gradient-to-br from-white to-slate-50 p-4 dark:from-slate-900 dark:to-slate-950 lg:block">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Build, generate, export and iterate your ASO assets from one polished workspace.
        </p>
      </Card>
    </aside>
  );
}
