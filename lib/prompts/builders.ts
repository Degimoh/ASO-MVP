import { GenerationType } from "@prisma/client";
import { PromptBuildInput, PromptBuildOutput, PromptProjectContext } from "./types";

function projectContextBlock(project: PromptProjectContext) {
  return [
    `App name: ${project.appName}`,
    `Platform: ${project.platform}`,
    `Category: ${project.category}`,
    `Summary: ${project.appSummary}`,
    `Core features: ${project.coreFeatures.join(", ")}`,
    `Target audience: ${project.targetAudience}`,
    `Tone of voice: ${project.toneOfVoice}`,
    `Primary language: ${project.primaryLanguage}`,
    `Target locales: ${project.targetLocales.join(", ")}`,
    `Competitors: ${project.competitors.join(", ") || "N/A"}`,
    `Important keywords: ${project.importantKeywords.join(", ") || "N/A"}`,
  ].join("\n");
}

function baseSystemPrompt() {
  return [
    "You are an expert App Store Optimization strategist.",
    "Always return strict JSON only (no markdown fences, no explanations).",
    "Use concise copy with strong conversion language while staying truthful.",
  ].join(" ");
}

function buildDescriptionPrompt(input: PromptBuildInput): PromptBuildOutput {
  return {
    systemPrompt: baseSystemPrompt(),
    userPrompt: `${projectContextBlock(input.project)}\n\nGenerate an app store description JSON object using this schema:\n{\n  "headline": "string",\n  "shortDescription": "string",\n  "fullDescription": "string",\n  "bulletHighlights": ["string"]\n}\nReturn 4-6 bulletHighlights.`,
  };
}

function buildKeywordPrompt(input: PromptBuildInput): PromptBuildOutput {
  return {
    systemPrompt: baseSystemPrompt(),
    userPrompt: `${projectContextBlock(input.project)}\n\nGenerate keyword strategy JSON with this schema:\n{\n  "primaryKeywords": ["string"],\n  "longTailKeywords": ["string"],\n  "negativeKeywords": ["string"],\n  "justification": "string"\n}\nUse 8-12 primaryKeywords and 8-12 longTailKeywords.`,
  };
}

function buildScreenshotCaptionsPrompt(input: PromptBuildInput): PromptBuildOutput {
  return {
    systemPrompt: baseSystemPrompt(),
    userPrompt: `${projectContextBlock(input.project)}\n\nCreate screenshot caption JSON with this schema:\n{\n  "captions": [\n    {\n      "screen": number,\n      "title": "string",\n      "caption": "string"\n    }\n  ]\n}\nCreate 5-7 screens and keep captions punchy.`,
  };
}

function buildUpdateNotesPrompt(input: PromptBuildInput): PromptBuildOutput {
  return {
    systemPrompt: baseSystemPrompt(),
    userPrompt: `${projectContextBlock(input.project)}\n\nGenerate release notes JSON with this schema:\n{\n  "version": "string",\n  "summary": "string",\n  "highlights": ["string"],\n  "callToAction": "string"\n}\nWrite as if this is a meaningful product update.`,
  };
}

function buildLocalizationPrompt(input: PromptBuildInput): PromptBuildOutput {
  const locale = input.targetLocale || input.project.targetLocales[0] || input.project.primaryLanguage;

  return {
    systemPrompt: `${baseSystemPrompt()} Prioritize natural localization quality for locale ${locale}.`,
    userPrompt: `${projectContextBlock(input.project)}\n\nGenerate localized app listing copy in locale "${locale}" as JSON:\n{\n  "locale": "string",\n  "localizedTitle": "string",\n  "localizedSubtitle": "string",\n  "localizedDescription": "string",\n  "localizedKeywords": ["string"]\n}`,
  };
}

const promptByType: Record<GenerationType, (input: PromptBuildInput) => PromptBuildOutput> = {
  DESCRIPTION: buildDescriptionPrompt,
  KEYWORDS: buildKeywordPrompt,
  SCREENSHOT_CAPTIONS: buildScreenshotCaptionsPrompt,
  UPDATE_NOTES: buildUpdateNotesPrompt,
  LOCALIZATION: buildLocalizationPrompt,
};

export function buildPrompt(input: PromptBuildInput): PromptBuildOutput {
  return promptByType[input.type](input);
}
