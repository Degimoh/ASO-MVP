import { z } from "zod";
import { buildKeywordsPrompt, KeywordsPromptProjectContext } from "@/src/lib/prompts/keywords.builder";
import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

const rawKeywordsSchema = z.object({
  keywords: z.union([z.string(), z.array(z.string())]),
});

export type KeywordsGenerationOutput = {
  keywords: string[];
  characterCount: number;
  withinLimit: boolean;
};

const KEYWORDS_CHAR_LIMIT = 100;

function normalizeKeywordSeparators(value: string) {
  return value
    .replace(/[;|\n\r\t]+/g, ",")
    .replace(/[，、]+/g, ",")
    .replace(/,+/g, ",");
}

function tokenizeKeywords(value: string) {
  return normalizeKeywordSeparators(value)
    .split(",")
    .map((keyword) => keyword.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function uniqueKeywords(input: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const keyword of input) {
    const normalized = keyword.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(keyword);
  }

  return output;
}

export function postProcessKeywords(input: string[] | string): KeywordsGenerationOutput {
  const rawKeywords = Array.isArray(input)
    ? input.flatMap((keyword) => tokenizeKeywords(keyword))
    : tokenizeKeywords(input);

  const keywords = uniqueKeywords(rawKeywords);
  const characterCount = keywords.join(",").length;

  return {
    keywords,
    characterCount,
    withinLimit: characterCount <= KEYWORDS_CHAR_LIMIT,
  };
}

export async function generateKeywords(input: {
  project: KeywordsPromptProjectContext;
  model?: string;
  temperature?: number;
}): Promise<{
  content: KeywordsGenerationOutput;
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const prompts = buildKeywordsPrompt(input.project);

  const completion = await requestOpenRouterJson<unknown>({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: input.model,
    temperature: input.temperature,
  });

  const parsed = rawKeywordsSchema.safeParse(completion.data);

  if (!parsed.success) {
    throw new Error("OpenRouter returned invalid keywords JSON structure");
  }

  const processed = postProcessKeywords(parsed.data.keywords);

  return {
    content: processed,
    model: completion.model,
    prompt: prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}
