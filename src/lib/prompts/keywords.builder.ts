import { Platform } from "@prisma/client";

export type KeywordsPromptProjectContext = {
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

export type KeywordsPromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildKeywordsPrompt(project: KeywordsPromptProjectContext): KeywordsPromptBuildResult {
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
  ].join("\n");

  return {
    systemPrompt: [
      "You are an App Store Optimization keyword strategist.",
      "Return strict JSON only with no markdown code fences.",
      "Prioritize discoverability and relevance while avoiding keyword stuffing.",
    ].join(" "),
    userPrompt: `${context}\n\nGenerate App Store keywords with this exact JSON schema:\n{\n  "keywords": ["string"]\n}\nRules:\n- produce 12-24 short keyword phrases\n- no duplicates\n- avoid brand violations and vague terms\n- optimize for App Store keyword field constraints`,
  };
}
