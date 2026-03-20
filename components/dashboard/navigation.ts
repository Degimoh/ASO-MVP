import { FolderKanban, PlusSquare, Settings, type LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: FolderKanban,
    description: "Manage and organize your ASO projects.",
  },
  {
    href: "/dashboard/create-project",
    label: "Create Project",
    icon: PlusSquare,
    description: "Start a new app listing optimization project.",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    description: "Configure your workspace and preferences.",
  },
];

export function getSectionMeta(pathname: string) {
  const match = dashboardNavItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (match) {
    return {
      title: match.label,
      description: match.description,
    };
  }

  return {
    title: "Dashboard",
    description: "Operate your AI ASO workflow from one place.",
  };
}
