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
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">AI ASO Generator</p>
          <h1 className="text-lg font-semibold text-slate-900">{section.title}</h1>
          <p className="hidden text-xs text-slate-500 sm:block">{section.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-600">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <UserCircle2 className="h-4 w-4" />
            {userLabel}
          </Button>
          <Button variant="outline" size="sm" disabled>
            {userBalance} credits
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
