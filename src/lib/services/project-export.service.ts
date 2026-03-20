import { ProjectWorkspaceRecord } from "@/src/lib/repositories/project.repository";

export type ProjectExportFormat = "json" | "txt";

export function parseProjectExportFormat(value: string | null): ProjectExportFormat {
  return value === "txt" ? "txt" : "json";
}

export function buildProjectExportJson(project: ProjectWorkspaceRecord) {
  return {
    project: {
      id: project.id,
      appName: project.appName,
      platform: project.platform,
      category: project.category,
      status: project.status,
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
    generatedAssets: project.generationResults.map((result) => ({
      id: result.id,
      assetType: result.type,
      status: result.status,
      version: result.version,
      locale: result.locale,
      model: result.model,
      prompt: result.prompt,
      generatedAt: result.generatedAt,
      updatedAt: result.updatedAt,
      content: result.content,
    })),
  };
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildProjectExportTxt(project: ProjectWorkspaceRecord): string {
  const lines: string[] = [];

  lines.push("AI ASO Generator - Project Export");
  lines.push("================================");
  lines.push(`Project ID: ${project.id}`);
  lines.push(`App Name: ${project.appName}`);
  lines.push(`Platform: ${toTitleCase(project.platform)}`);
  lines.push(`Category: ${project.category}`);
  lines.push(`Status: ${toTitleCase(project.status)}`);
  lines.push(`Primary Language: ${project.primaryLanguage}`);
  lines.push(`Target Locales: ${project.locales.map((locale) => locale.code).join(", ") || "N/A"}`);
  lines.push(`Created At: ${project.createdAt.toISOString()}`);
  lines.push(`Updated At: ${project.updatedAt.toISOString()}`);
  lines.push("");

  lines.push("App Summary");
  lines.push("-----------");
  lines.push(project.appSummary);
  lines.push("");

  lines.push("Core Features");
  lines.push("-------------");
  if (project.features.length === 0) {
    lines.push("- N/A");
  } else {
    project.features.forEach((feature) => lines.push(`- ${feature.value}`));
  }
  lines.push("");

  lines.push("Target Audience");
  lines.push("---------------");
  lines.push(project.targetAudience);
  lines.push("");

  lines.push("Tone Of Voice");
  lines.push("-------------");
  lines.push(project.toneOfVoice);
  lines.push("");

  lines.push("Competitors");
  lines.push("-----------");
  if (project.competitors.length === 0) {
    lines.push("- N/A");
  } else {
    project.competitors.forEach((competitor) => lines.push(`- ${competitor}`));
  }
  lines.push("");

  lines.push("Important Keywords");
  lines.push("------------------");
  if (project.importantKeywords.length === 0) {
    lines.push("- N/A");
  } else {
    project.importantKeywords.forEach((keyword) => lines.push(`- ${keyword}`));
  }
  lines.push("");

  lines.push("Generated Assets");
  lines.push("----------------");
  if (project.generationResults.length === 0) {
    lines.push("No generated assets found.");
  } else {
    project.generationResults.forEach((result, index) => {
      lines.push("");
      lines.push(`${index + 1}. ${toTitleCase(result.type)}${result.locale ? ` (${result.locale})` : ""}`);
      lines.push(`   - Asset ID: ${result.id}`);
      lines.push(`   - Version: ${result.version}`);
      lines.push(`   - Status: ${toTitleCase(result.status)}`);
      lines.push(`   - Model: ${result.model}`);
      lines.push(`   - Generated At: ${result.generatedAt.toISOString()}`);
      lines.push(`   - Updated At: ${result.updatedAt.toISOString()}`);
      lines.push("   - Content:");
      lines.push(
        ...JSON.stringify(result.content, null, 2)
          .split("\n")
          .map((line) => `     ${line}`),
      );
    });
  }

  return lines.join("\n");
}

export function buildExportFilename(appName: string, format: ProjectExportFormat): string {
  const safeBase = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";

  return `${safeBase}-aso-assets.${format}`;
}
