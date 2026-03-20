import { ProjectWorkspaceClient } from "@/components/workspace/project-workspace-client";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <ProjectWorkspaceClient projectId={projectId} />
    </div>
  );
}
