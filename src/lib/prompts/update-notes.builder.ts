import { Platform } from "@prisma/client";

export type UpdateNotesMode =
  | "bug-fix"
  | "minor-update"
  | "feature-release"
  | "major-release";

export type UpdateNotesPromptProjectContext = {
  appName: string;
  platform: Platform;
  category: string;
  appSummary: string;
  coreFeatures: string[];
  targetAudience: string;
  toneOfVoice: string;
  primaryLanguage: string;
  targetLocales: string[];
  competitors: string[];
  importantKeywords: string[];
};

export type UpdateNotesPromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
};

function modeLabel(mode: UpdateNotesMode) {
  switch (mode) {
    case "bug-fix":
      return "Bug Fix";
    case "minor-update":
      return "Minor Update";
    case "feature-release":
      return "Feature Release";
    case "major-release":
      return "Major Release";
    default:
      return "Update";
  }
}

export function buildUpdateNotesPrompt(
  project: UpdateNotesPromptProjectContext,
  mode: UpdateNotesMode,
): UpdateNotesPromptBuildResult {
  const context = [
    `App Name: ${project.appName}`,
    `Platform: ${project.platform}`,
    `Category: ${project.category}`,
    `App Summary: ${project.appSummary}`,
    `Core Features: ${project.coreFeatures.join(", ")}`,
    `Target Audience: ${project.targetAudience}`,
    `Tone of Voice: ${project.toneOfVoice}`,
    `Primary Language: ${project.primaryLanguage}`,
    `Target Locales: ${project.targetLocales.join(", ")}`,
    `Competitors: ${project.competitors.join(", ") || "N/A"}`,
    `Important Keywords: ${project.importantKeywords.join(", ") || "N/A"}`,
    `Release Mode: ${modeLabel(mode)}`,
  ].join("\n");

  return {
    systemPrompt: [
      "You are a senior mobile app release manager and ASO copywriter.",
      "Write concise, trustworthy release notes that increase update adoption.",
      "Return strict JSON only without markdown wrappers.",
    ].join(" "),
    userPrompt: `${context}\n\nGenerate update notes using this exact JSON schema:\n{\n  "title": "string",\n  "notes": ["string"]\n}\nRules:\n- produce 3-6 notes\n- each note should be specific and user-facing\n- keep notes concise and action-oriented\n- ensure tone matches the project context and release mode`,
  };
}
