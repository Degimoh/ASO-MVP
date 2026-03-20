import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectItem = {
  id: string;
  appName: string;
  platform: string;
  category: string;
  targetLocales: string[];
  generationResults: Array<{ id: string }>;
  updatedAt: string;
};

type Props = {
  projects: ProjectItem[];
};

export function ProjectList({ projects }: Props) {
  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                {project.appName}
              </Link>
            </CardTitle>
            <CardDescription>{project.category}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{project.platform}</Badge>
              <Badge variant="outline">{project.targetLocales.length} locales</Badge>
              <Badge variant="outline">{project.generationResults.length} assets</Badge>
            </div>
            <p>Updated {new Date(project.updatedAt).toLocaleString()}</p>
            <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-medium text-slate-900 hover:underline">
              Open workspace
            </Link>
          </CardContent>
        </Card>
      ))}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            No projects yet. Create one to start generating ASO assets.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
