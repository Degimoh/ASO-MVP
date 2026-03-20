import { Platform } from "@prisma/client";

export type ScreenshotCaptionsPromptProjectContext = {
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

export type ScreenshotCaptionsPromptBuildResult = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildScreenshotCaptionsPrompt(
  project: ScreenshotCaptionsPromptProjectContext,
): ScreenshotCaptionsPromptBuildResult {
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
      "You are an expert mobile growth copywriter focused on screenshot caption strategy.",
      "Write concise, marketing-friendly caption lines that communicate user value clearly.",
      "Return strict JSON only with no markdown or additional text.",
    ].join(" "),
    userPrompt: `${context}\n\nGenerate screenshot captions in this exact schema:\n{\n  "captions": ["string"]\n}\nRules:\n- provide 5-8 captions\n- each caption must be concise and marketing-friendly\n- each caption should focus on one clear benefit\n- do not repeat wording across captions`,
  };
}
