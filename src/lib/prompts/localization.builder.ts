import { Platform } from "@prisma/client";

export type LocalizableAssetType =
  | "DESCRIPTION"
  | "KEYWORDS"
  | "SCREENSHOT_CAPTIONS"
  | "UPDATE_NOTES";

export type LocalizationPromptProjectContext = {
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

export type LocalizationPromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildLocalizationPrompt(input: {
  project: LocalizationPromptProjectContext;
  sourceAssetType: LocalizableAssetType;
  sourceContent: Record<string, unknown>;
  targetLocale: string;
}): LocalizationPromptBuildResult {
  const project = input.project;

  const context = [
    `App Name: ${project.appName}`,
    `Platform: ${project.platform}`,
    `Category: ${project.category}`,
    `App Summary: ${project.appSummary}`,
    `Core Features: ${project.coreFeatures.join(", ")}`,
    `Target Audience: ${project.targetAudience}`,
    `Tone of Voice: ${project.toneOfVoice}`,
    `Primary Language: ${project.primaryLanguage}`,
    `Source Asset Type: ${input.sourceAssetType}`,
    `Target Locale: ${input.targetLocale}`,
  ].join("\n");

  return {
    systemPrompt: [
      "You are an ASO localization specialist.",
      "Localize existing ASO content for the target locale while preserving conversion intent and brand tone.",
      "Return strict JSON only with the exact same structure and keys as the source content.",
      "Do not add or remove keys.",
    ].join(" "),
    userPrompt: `${context}\n\nLocalize this source JSON into locale \"${input.targetLocale}\":\n${JSON.stringify(
      input.sourceContent,
      null,
      2,
    )}\n\nRequirements:\n- Preserve ASO style and marketing intent from the source\n- Keep structure identical to the source\n- Keep arrays and fields aligned with source semantics\n- Return only valid JSON`,
  };
}
