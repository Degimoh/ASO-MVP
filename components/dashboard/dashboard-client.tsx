"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateProjectForm } from "@/components/dashboard/create-project-form";
import { ProjectList } from "@/components/dashboard/project-list";

type ProjectRecord = {
  id: string;
  appName: string;
  platform: string;
  category: string;
  targetLocales: string[];
  generationResults: Array<{ id: string }>;
  updatedAt: string;
};

export function DashboardClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load projects");
      }

      const body = (await response.json()) as { data: ProjectRecord[] };
      setProjects(body.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="space-y-6">
      <CreateProjectForm onCreated={loadProjects} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your Projects</h2>
        {isLoading ? <p className="text-sm text-slate-500">Loading projects...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!isLoading && !error ? <ProjectList projects={projects} /> : null}
      </section>
    </div>
  );
}
