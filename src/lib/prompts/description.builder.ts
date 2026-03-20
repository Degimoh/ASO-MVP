import { Platform } from "@prisma/client";

export type DescriptionPromptProjectContext = {
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

export type DescriptionPromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildDescriptionPrompt(
  project: DescriptionPromptProjectContext,
): DescriptionPromptBuildResult {
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
      "You are an expert App Store Optimization copywriter.",
      "Write compelling but truthful App Store descriptions.",
      "Return strict JSON only with no markdown or prose outside JSON.",
    ].join(" "),
    userPrompt: `${context}\n\nGenerate a structured App Store description JSON object with exactly this schema:\n{\n  "hook": "string",\n  "body": "string",\n  "features": ["string"],\n  "cta": "string",\n  "fullText": "string"\n}\nRequirements:\n- features must contain 3-6 concise bullets\n- body should be 2-4 sentences\n- fullText should combine hook, body, features, and cta into one publish-ready description`,
  };
}
