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
    <aside className="w-full border-b border-slate-200 bg-white p-4 lg:h-[calc(100vh-4.5rem)] lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-5 flex items-center gap-2 px-2">
        <Sparkles className="h-5 w-5 text-slate-900" />
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card className="mt-6 hidden border-dashed bg-slate-50 p-4 lg:block">
        <p className="text-xs text-slate-600">
          MVP Shell: navigation is wired with mock content placeholders for rapid iteration.
        </p>
      </Card>
    </aside>
  );
}
