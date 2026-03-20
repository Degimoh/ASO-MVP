import { GenerationResult, Project } from "@prisma/client";

type ProjectWithRelations = Project & {
  features: Array<{ value: string }>;
  locales: Array<{ code: string }>;
  generationResults: GenerationResult[];
};

export function buildProjectExport(project: ProjectWithRelations) {
  return {
    project: {
      id: project.id,
      appName: project.appName,
      platform: project.platform,
      category: project.category,
      appSummary: project.appSummary,
      coreFeatures: project.features.map((feature) => feature.value),
      targetAudience: project.targetAudience,
      toneOfVoice: project.toneOfVoice,
      primaryLanguage: project.primaryLanguage,
      targetLocales: project.locales.map((locale) => locale.code),
      competitors: project.competitors,
      importantKeywords: project.importantKeywords,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    generationResults: project.generationResults.map((result) => ({
      id: result.id,
      type: result.type,
      locale: result.locale,
      model: result.model,
      generatedAt: result.generatedAt,
      updatedAt: result.updatedAt,
      content: result.content,
    })),
  };
}

export function buildTxtExport(project: ProjectWithRelations) {
  const lines: string[] = [];
  lines.push(`App: ${project.appName}`);
  lines.push(`Platform: ${project.platform}`);
  lines.push(`Category: ${project.category}`);
  lines.push(`Summary: ${project.appSummary}`);
  lines.push(`Core Features: ${project.features.map((feature) => feature.value).join(", ")}`);
  lines.push(`Target Audience: ${project.targetAudience}`);
  lines.push(`Tone: ${project.toneOfVoice}`);
  lines.push(`Primary Language: ${project.primaryLanguage}`);
  lines.push(`Target Locales: ${project.locales.map((locale) => locale.code).join(", ")}`);
  lines.push(`Competitors: ${project.competitors.join(", ") || "N/A"}`);
  lines.push(`Important Keywords: ${project.importantKeywords.join(", ") || "N/A"}`);
  lines.push("");
  lines.push("=== Generated Assets ===");

  project.generationResults.forEach((result) => {
    lines.push("");
    lines.push(`# ${result.type}${result.locale ? ` (${result.locale})` : ""}`);
    lines.push(`Model: ${result.model}`);
    lines.push(`Generated: ${result.generatedAt.toISOString()}`);
    lines.push(JSON.stringify(result.content, null, 2));
  });

  return lines.join("\n");
}
