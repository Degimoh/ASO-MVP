import { z } from "zod";
import {
  buildLocalizationPrompt,
  LocalizationPromptProjectContext,
  LocalizableAssetType,
} from "@/src/lib/prompts/localization.builder";
import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

const descriptionSchema = z.object({
  hook: z.string(),
  body: z.string(),
  features: z.array(z.string()),
  cta: z.string(),
  fullText: z.string(),
});

const keywordsSchema = z.object({
  keywords: z.array(z.string()),
  characterCount: z.number(),
  withinLimit: z.boolean(),
});

const captionsSchema = z.object({
  captions: z.array(z.string()),
});

const updateNotesSchema = z.object({
  title: z.string(),
  notes: z.array(z.string()),
});

function getSourceSchema(sourceAssetType: LocalizableAssetType) {
  switch (sourceAssetType) {
    case "DESCRIPTION":
      return descriptionSchema;
    case "KEYWORDS":
      return keywordsSchema;
    case "SCREENSHOT_CAPTIONS":
      return captionsSchema;
    case "UPDATE_NOTES":
      return updateNotesSchema;
    default:
      return descriptionSchema;
  }
}

function hasSameShape(source: unknown, target: unknown): boolean {
  if (source === null || target === null) {
    return source === target;
  }

  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      return false;
    }

    if (source.length === 0 || target.length === 0) {
      return true;
    }

    return target.every((item) => hasSameShape(source[0], item));
  }

  if (typeof source === "object") {
    if (typeof target !== "object" || Array.isArray(target)) {
      return false;
    }

    const sourceRecord = source as Record<string, unknown>;
    const targetRecord = target as Record<string, unknown>;

    const sourceKeys = Object.keys(sourceRecord).sort();
    const targetKeys = Object.keys(targetRecord).sort();

    if (sourceKeys.length !== targetKeys.length) {
      return false;
    }

    for (let i = 0; i < sourceKeys.length; i += 1) {
      if (sourceKeys[i] !== targetKeys[i]) {
        return false;
      }
    }

    return sourceKeys.every((key) => hasSameShape(sourceRecord[key], targetRecord[key]));
  }

  return typeof source === typeof target;
}

function trimStringsDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim().replace(/\s+/g, " ");
  }

  if (Array.isArray(value)) {
    return value.map((item) => trimStringsDeep(item));
  }

  if (typeof value === "object" && value !== null) {
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = trimStringsDeep(nestedValue);
    }

    return output;
  }

  return value;
}

export async function generateLocalizedAsset(input: {
  project: LocalizationPromptProjectContext;
  sourceAssetType: LocalizableAssetType;
  sourceContent: Record<string, unknown>;
  targetLocale: string;
  model?: string;
  temperature?: number;
}): Promise<{
  content: Record<string, unknown>;
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const sourceSchema = getSourceSchema(input.sourceAssetType);
  const sourceParsed = sourceSchema.safeParse(input.sourceContent);

  if (!sourceParsed.success) {
    throw new Error("Invalid source content shape for localization");
  }

  const prompts = buildLocalizationPrompt({
    project: input.project,
    sourceAssetType: input.sourceAssetType,
    sourceContent: sourceParsed.data,
    targetLocale: input.targetLocale,
  });

  const completion = await requestOpenRouterJson<unknown>({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: input.model,
    temperature: input.temperature,
  });

  if (!completion.data || typeof completion.data !== "object" || Array.isArray(completion.data)) {
    throw new Error("OpenRouter returned invalid localization JSON structure");
  }

  if (!hasSameShape(sourceParsed.data, completion.data)) {
    throw new Error("Localized content does not match source asset shape");
  }

  const normalized = trimStringsDeep(completion.data) as Record<string, unknown>;

  return {
    content: normalized,
    model: completion.model,
    prompt: prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}
