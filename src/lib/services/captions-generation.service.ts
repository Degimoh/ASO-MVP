import { z } from "zod";
import { buildScreenshotCaptionsPrompt, ScreenshotCaptionsPromptProjectContext } from "@/src/lib/prompts/captions.builder";
import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

const MAX_CAPTION_LENGTH = 70;

const rawCaptionsSchema = z.object({
  captions: z.union([z.array(z.string()), z.array(z.object({ caption: z.string() }))]),
});

export type CaptionsGenerationOutput = {
  captions: string[];
};

function normalizeCaption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function dedupeCaptions(captions: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const caption of captions) {
    const normalizedKey = caption.toLowerCase();

    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    output.push(caption);
  }

  return output;
}

function extractRawCaptions(input: z.infer<typeof rawCaptionsSchema>["captions"]) {
  if (input.length === 0) {
    return [] as string[];
  }

  const first = input[0];

  if (typeof first === "string") {
    return (input as string[]).map(normalizeCaption).filter(Boolean);
  }

  return (input as Array<{ caption: string }>)
    .map((item) => normalizeCaption(item.caption))
    .filter(Boolean);
}

function validateCaptions(captions: string[]) {
  if (captions.length === 0) {
    throw new Error("No captions were generated");
  }

  const overLimit = captions.find((caption) => caption.length > MAX_CAPTION_LENGTH);
  if (overLimit) {
    throw new Error(`Caption exceeds max length of ${MAX_CAPTION_LENGTH} characters`);
  }

  const normalizedSet = new Set(captions.map((caption) => caption.toLowerCase()));
  if (normalizedSet.size !== captions.length) {
    throw new Error("Captions must be unique");
  }
}

export async function generateScreenshotCaptions(input: {
  project: ScreenshotCaptionsPromptProjectContext;
  model?: string;
  temperature?: number;
}): Promise<{
  content: CaptionsGenerationOutput;
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const prompts = buildScreenshotCaptionsPrompt(input.project);

  const completion = await requestOpenRouterJson<unknown>({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: input.model,
    temperature: input.temperature,
  });

  const parsed = rawCaptionsSchema.safeParse(completion.data);

  if (!parsed.success) {
    throw new Error("OpenRouter returned invalid captions JSON structure");
  }

  const normalized = dedupeCaptions(extractRawCaptions(parsed.data.captions));
  validateCaptions(normalized);

  return {
    content: { captions: normalized },
    model: completion.model,
    prompt: prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}
