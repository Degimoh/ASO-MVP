"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Projects", icon: FolderKanban },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white p-4 lg:h-screen lg:w-64 lg:border-r lg:border-b-0">
      <div className="mb-8 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-slate-900" />
        <span className="font-semibold">AI ASO Generator</span>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
