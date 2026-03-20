"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, WandSparkles } from "lucide-react";
import { GenerationEditorCard } from "@/components/workspace/generation-editor-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GenerationTypeOption } from "@/lib/constants";

type GenerationRecord = {
  id: string;
  type: GenerationTypeOption;
  locale: string | null;
  model: string;
  content: Record<string, unknown>;
  generatedAt: string;
};

type ProjectRecord = {
  id: string;
  appName: string;
  platform: string;
  category: string;
  appSummary: string;
  coreFeatures: string[];
  targetAudience: string;
  toneOfVoice: string;
  primaryLanguage: string;
  targetLocales: string[];
  competitors: string[];
  importantKeywords: string[];
  generationResults: GenerationRecord[];
};

const generationOptions: Array<{ value: GenerationTypeOption; label: string }> = [
  { value: "DESCRIPTION", label: "App Store Description" },
  { value: "KEYWORDS", label: "Keyword Set" },
  { value: "SCREENSHOT_CAPTIONS", label: "Screenshot Captions" },
  { value: "UPDATE_NOTES", label: "Update Notes" },
  { value: "LOCALIZATION", label: "Localization" },
];

type Props = {
  projectId: string;
};

export function ProjectWorkspaceClient({ projectId }: Props) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<GenerationTypeOption>("DESCRIPTION");
  const [targetLocale, setTargetLocale] = useState<string>("");

  const loadProject = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load project");
      }
      const body = (await response.json()) as { data: ProjectRecord };
      setProject(body.data);
      setTargetLocale(body.data.targetLocales[0] || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function handleGenerate() {
    if (!project) return;

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          type: selectedType,
          targetLocale: selectedType === "LOCALIZATION" ? targetLocale : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Generation failed");
      }

      await loadProject();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  const sortedResults = useMemo(() => {
    if (!project) return [];
    return [...project.generationResults].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
  }, [project]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading workspace...</p>;
  }

  if (error && !project) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!project) {
    return <p className="text-sm text-red-600">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>
          <h1 className="text-2xl font-semibold">{project.appName}</h1>
          <p className="text-sm text-slate-600">
            {project.platform} · {project.category}
          </p>
        </div>

        <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Context</CardTitle>
          <CardDescription>These inputs drive all ASO generations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>{project.appSummary}</p>
          <p>
            <span className="font-medium">Audience:</span> {project.targetAudience}
          </p>
          <p>
            <span className="font-medium">Tone:</span> {project.toneOfVoice}
          </p>
          <div className="flex flex-wrap gap-2">
            {project.coreFeatures.map((feature) => (
              <Badge key={feature} variant="secondary">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate New Asset</CardTitle>
          <CardDescription>OpenRouter-backed generation with fallback templates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="space-y-2 md:col-span-1">
            <Label>Asset Type</Label>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as GenerationTypeOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {generationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <Label>Target Locale (for localization)</Label>
            <Select value={targetLocale} onValueChange={setTargetLocale}>
              <SelectTrigger>
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                {project.targetLocales.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {locale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
            <WandSparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>

          {error ? <p className="text-sm text-red-600 md:col-span-3">{error}</p> : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Generated Assets</h2>
        {sortedResults.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-slate-500">
              No assets yet. Generate your first ASO output above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedResults.map((result) => (
              <GenerationEditorCard key={result.id} generation={result} onSaved={loadProject} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
