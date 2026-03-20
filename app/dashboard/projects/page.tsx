import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const mockProjects = [
  { id: "proj_001", name: "Habit Flow", status: "Active", platform: "iOS" },
  { id: "proj_002", name: "BudgetNest", status: "Draft", platform: "Android" },
  { id: "proj_003", name: "FocusFuel", status: "Archived", platform: "Cross Platform" },
];

export default function ProjectsPage() {
  return (
    <PageShell
      title="Projects"
      description="Browse your ASO workspaces, monitor status, and jump into any project quickly."
    >
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search projects (mock)" />
          </div>
          <Button asChild>
            <Link href="/dashboard/create-project">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockProjects.map((project) => (
          <Card key={project.id} className="transition hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{project.platform}</Badge>
                <Badge variant={project.status === "Active" ? "default" : "outline"}>{project.status}</Badge>
              </div>
              <p>ID: {project.id}</p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Open Workspace (mock)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
