import Link from "next/link";
import { Plus } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";
import { listProjectCardsByUserId } from "@/src/lib/repositories/project.repository";

export const dynamic = "force-dynamic";

function formatPlatform(platform: string) {
  return platform
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjectCardsByUserId>> = [];
  let loadError: string | null = null;

  try {
    const user = await getCurrentUserFromSession();
    projects = user ? await listProjectCardsByUserId(user.id) : [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown database error";
  }

  return (
    <PageShell
      title="Projects"
      description="Browse your ASO projects and open a workspace when ready."
    >
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/dashboard/create-project">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Link>
        </Button>
      </div>

      {loadError ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle>Could not load projects</CardTitle>
            <CardDescription>
              Check production environment variables and run database migrations (`prisma migrate deploy`).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loadError && projects.length === 0 ? (
        <Card className="border-dashed bg-white/80">
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>Create your first project to start generating ASO assets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/create-project">Create your first project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !loadError ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block">
              <Card className="h-full border-slate-200/80 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60">
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-base">{project.appName}</CardTitle>
                  <CardDescription>{project.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-900">Platform:</span> {formatPlatform(project.platform)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Primary language:</span> {project.primaryLanguage}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Updated:</span>{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(project.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
