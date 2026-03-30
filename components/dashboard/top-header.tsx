"use client";

import { Bell, UserCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { getSectionMeta } from "@/components/dashboard/navigation";

type DashboardTopHeaderProps = {
  userLabel: string;
  userBalance: number;
};

export function DashboardTopHeader({ userLabel, userBalance }: DashboardTopHeaderProps) {
  const pathname = usePathname();
  const section = getSectionMeta(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-lime-200/80 bg-white/75 backdrop-blur-xl dark:border-lime-900/60 dark:bg-[#03140b]/80">
      <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-600/90 dark:text-lime-300/90">
            AI ASO Generator
          </p>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{section.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-lime-700/80 hover:text-lime-900 dark:text-lime-300/80 dark:hover:text-lime-100"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-lime-200/80 bg-lime-50/70 text-lime-900 dark:border-lime-800/80 dark:bg-lime-950/30 dark:text-lime-100"
            disabled
          >
            <UserCircle2 className="h-4 w-4" />
            {userLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-lime-300/80 bg-lime-100/80 text-lime-900 dark:border-lime-500/40 dark:bg-lime-400/10 dark:text-lime-200"
            disabled
          >
            {userBalance} credits
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
