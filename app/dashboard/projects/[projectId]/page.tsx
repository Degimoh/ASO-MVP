import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectWorkspaceTabs, WorkspaceTabType } from "@/components/workspace/project-workspace-tabs";
import { getProjectWorkspaceById } from "@/src/lib/repositories/project.repository";

export const dynamic = "force-dynamic";

function formatPlatform(platform: string) {
  return platform
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toEditableText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content, null, 2);
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectWorkspaceById(projectId);

  if (!project) {
    return (
      <PageShell title="Project Workspace" description="Project details and generated content tabs.">
        <Card>
          <CardHeader>
            <CardTitle>Project not found</CardTitle>
            <CardDescription>The requested project does not exist or was removed.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  const initialContent: Partial<Record<WorkspaceTabType, string>> = {};

  for (const result of project.generationResults) {
    const key = result.type as WorkspaceTabType;
    if (!initialContent[key]) {
      initialContent[key] = toEditableText(result.content);
    }
  }

  return (
    <PageShell
      title="Project Workspace"
      description="Review project context and manage ASO content drafts by tab."
    >
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{project.appName}</CardTitle>
              <CardDescription>
                {formatPlatform(project.platform)} · {project.category}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Primary language:</span> {project.primaryLanguage}
              </p>
              <p>
                <span className="font-medium text-slate-900">Tone:</span> {project.toneOfVoice}
              </p>
              <p>
                <span className="font-medium text-slate-900">Updated:</span>{" "}
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(project.updatedAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Core Features</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.features.length === 0 ? (
                <p className="text-sm text-slate-500">No features added yet.</p>
              ) : (
                project.features.map((feature) => (
                  <Badge key={feature.id} variant="secondary">
                    {feature.value}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target Locales</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.locales.length === 0 ? (
                <p className="text-sm text-slate-500">No locales configured.</p>
              ) : (
                project.locales.map((locale) => (
                  <Badge key={locale.id} variant="outline">
                    {locale.code}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <ProjectWorkspaceTabs projectId={project.id} initialContent={initialContent} />
          <div className="mt-3 text-xs text-slate-500">
            Description, Keywords, Screenshot Captions, and Update Notes generation are connected. Localization regenerate remains placeholder.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
