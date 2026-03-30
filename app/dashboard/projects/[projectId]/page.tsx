import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PageShell } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenshotCreativesPanel } from "@/components/workspace/screenshot-creatives-panel";
import { ProjectWorkspaceTabs, WorkspaceTabType } from "@/components/workspace/project-workspace-tabs";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";
import { getProjectWorkspaceByIdForUser } from "@/src/lib/repositories/project.repository";
import { SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE } from "@/src/lib/wallet/generation-pricing";

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
  let project: Awaited<ReturnType<typeof getProjectWorkspaceByIdForUser>> = null;
  let authUser: Awaited<ReturnType<typeof getCurrentUserFromSession>> = null;
  let loadError: string | null = null;

  try {
    authUser = await getCurrentUserFromSession();

    if (!authUser) {
      loadError = "Unauthorized";
    } else {
      project = await getProjectWorkspaceByIdForUser(projectId, authUser.id);
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown database error";
  }

  if (loadError) {
    return (
      <PageShell title="Project Workspace" description="Project details and generated content tabs.">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle>Could not load project workspace</CardTitle>
            <CardDescription>
              Verify `DATABASE_URL` in production and apply migrations with `prisma migrate deploy`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{loadError}</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

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
  const initialVersionHistory = project.generationResults.map((result) => ({
    id: result.id,
    type: result.type as WorkspaceTabType,
    locale: result.locale,
    version: result.version,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  }));

  return (
    <PageShell
      title="Project Workspace"
      description="Review project context and manage ASO content drafts by tab."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/projects/${project.id}/export?format=json`}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/projects/${project.id}/export?format=txt`}>
              <Download className="mr-2 h-4 w-4" />
              Export TXT
            </a>
          </Button>
        </div>
      </div>

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
          <ProjectWorkspaceTabs
            projectId={project.id}
            availableLocales={project.locales.map((locale) => locale.code)}
            initialContent={initialContent}
            initialVersionHistory={initialVersionHistory}
            initialWalletBalance={authUser?.walletBalance ?? 0}
          />
          <div className="mt-4">
            <ScreenshotCreativesPanel
              projectId={project.id}
              initialWalletBalance={authUser?.walletBalance ?? 0}
              creditsPerImage={SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE}
            />
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Individual generators and Generate All are connected with partial-error handling.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
