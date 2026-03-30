import { Platform } from "@prisma/client";

export type ScreenshotCreativePromptInput = {
  appName: string;
  platform: Platform;
  category: string;
  appSummary: string;
  coreFeatures: string[];
  targetAudience: string;
  toneOfVoice: string;
  primaryLanguage: string;
  importantKeywords: string[];
  existingCaptions?: string[];
  screenshotCount: number;
  screenshotSpecificContext?: string;
};

export type ScreenshotCreativePromptResult = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildScreenshotCreativesPrompt(input: ScreenshotCreativePromptInput): ScreenshotCreativePromptResult {
  const context = [
    `App Name: ${input.appName}`,
    `Platform: ${input.platform}`,
    `Category: ${input.category}`,
    `App Summary: ${input.appSummary}`,
    `Core Features: ${input.coreFeatures.join(", ") || "N/A"}`,
    `Target Audience: ${input.targetAudience}`,
    `Tone of Voice: ${input.toneOfVoice}`,
    `Primary Language: ${input.primaryLanguage}`,
    `Important Keywords: ${input.importantKeywords.join(", ") || "N/A"}`,
    `Existing Screenshot Captions: ${input.existingCaptions?.join(" | ") || "N/A"}`,
  ].join("\n");

  return {
    systemPrompt: [
      "You are an expert ASO creative strategist.",
      "Generate short, high-converting overlay text for Apple App Store screenshots.",
      "When screenshot-specific context is provided, adapt the text to what is visible in that screenshot while still aligning with the product category and summary.",
      "Return strict JSON only.",
    ].join(" "),
    userPrompt: `${context}

${input.screenshotSpecificContext ? `Screenshot-specific context: ${input.screenshotSpecificContext}` : ""}

Generate ${input.screenshotCount} creative text variants in this exact schema:
{
  "items": [
    {
      "headline": "string",
      "subheadline": "string"
    }
  ]
}

Rules:
- Exactly ${input.screenshotCount} items.
- Headline length: 18-52 characters.
- Subheadline length: 24-90 characters.
- Marketing-focused, concise, no emojis.
- Each item should highlight a different app benefit.
- Output language must be ${input.primaryLanguage}.`,
  };
}
