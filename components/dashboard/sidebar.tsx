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
    <aside className="w-full border-b border-lime-200/80 bg-white/75 p-4 backdrop-blur-md dark:border-lime-800/60 dark:bg-[#03100a]/70 lg:h-[calc(100vh-4.5rem)] lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-100 to-green-100 px-3 py-2.5 dark:from-lime-400/20 dark:to-green-400/20">
        <Sparkles className="h-5 w-5 text-lime-700 dark:text-lime-300" />
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
                  ? "bg-lime-700 text-white shadow-[0_14px_32px_-18px_rgba(77,124,15,0.9)] dark:bg-lime-400/20 dark:text-lime-100 dark:shadow-none"
                  : "text-slate-700 hover:bg-lime-50 hover:text-lime-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-lime-500/10 dark:hover:text-lime-100 dark:hover:shadow-none",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card className="mt-6 hidden border-dashed bg-gradient-to-br from-white to-lime-50/50 p-4 dark:from-[#06160e] dark:to-[#03100a] lg:block">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Build, generate, export and iterate your ASO assets from one polished workspace.
        </p>
      </Card>
    </aside>
  );
}
