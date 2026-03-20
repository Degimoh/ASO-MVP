import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <PageShell
      title="Project Workspace"
      description="Mock workspace layout for generated assets and editing panels."
    >
      <Card>
        <CardHeader>
          <CardTitle>Project ID: {projectId}</CardTitle>
          <CardDescription>This view is currently static and not connected to live project data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-slate-600">Generated assets panel (mock)</CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-slate-600">Content editor panel (mock)</CardContent>
            </Card>
          </div>
          <Button disabled>Generate Asset (mock)</Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
