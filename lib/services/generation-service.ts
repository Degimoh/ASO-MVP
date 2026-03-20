import { GenerationType } from "@prisma/client";
import { generateStructuredContent } from "@/lib/ai/openrouter";
import { buildPrompt } from "@/lib/prompts/builders";
import { PromptProjectContext } from "@/lib/prompts/types";

function fallbackContent(type: GenerationType, project: PromptProjectContext, locale?: string) {
  const featureLine = project.coreFeatures.slice(0, 3).join(", ");
  switch (type) {
    case "DESCRIPTION":
      return {
        headline: `${project.appName}: ${project.category} made simple`,
        shortDescription: `${project.appSummary.slice(0, 140)}...`,
        fullDescription: `${project.appName} helps ${project.targetAudience.toLowerCase()} with ${featureLine}.`,
        bulletHighlights: project.coreFeatures.slice(0, 6),
      };
    case "KEYWORDS":
      return {
        primaryKeywords: project.importantKeywords.slice(0, 12),
        longTailKeywords: project.importantKeywords.map((keyword) => `${keyword} app`).slice(0, 12),
        negativeKeywords: ["free hack", "pirated"],
        justification: `Keywords align with ${project.category} intent and core features.`,
      };
    case "SCREENSHOT_CAPTIONS":
      return {
        captions: project.coreFeatures.slice(0, 6).map((feature, index) => ({
          screen: index + 1,
          title: feature,
          caption: `Show how ${project.appName} delivers: ${feature}`,
        })),
      };
    case "UPDATE_NOTES":
      return {
        version: "1.0.0",
        summary: `Major improvements to ${project.appName}`,
        highlights: [
          `Improved ${project.coreFeatures[0] || "performance"}`,
          "Fixed key usability issues",
          "Polished onboarding experience",
        ],
        callToAction: "Update now for the best experience.",
      };
    case "LOCALIZATION":
      return {
        locale: locale || project.primaryLanguage,
        localizedTitle: project.appName,
        localizedSubtitle: `${project.category} for ${project.targetAudience}`,
        localizedDescription: project.appSummary,
        localizedKeywords: project.importantKeywords.slice(0, 10),
      };
    default:
      return { message: "Unsupported generation type" };
  }
}

export async function generateAsoContent(input: {
  type: GenerationType;
  project: PromptProjectContext;
  targetLocale?: string;
}) {
  const prompts = buildPrompt({
    type: input.type,
    project: input.project,
    targetLocale: input.targetLocale,
  });

  try {
    const result = await generateStructuredContent(prompts);
    return {
      prompt: prompts.userPrompt,
      model: result.model,
      content: result.content,
      fallbackUsed: false,
    };
  } catch {
    return {
      prompt: prompts.userPrompt,
      model: "fallback-template",
      content: fallbackContent(input.type, input.project, input.targetLocale),
      fallbackUsed: true,
    };
  }
}
