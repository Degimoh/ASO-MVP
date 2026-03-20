import { z } from "zod";
import {
  buildDescriptionPrompt,
  DescriptionPromptProjectContext,
} from "@/src/lib/prompts/description.builder";
import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

const descriptionOutputSchema = z
  .object({
    hook: z.string().trim().min(1),
    body: z.string().trim().min(1),
    features: z.array(z.string().trim().min(1)).min(1),
    cta: z.string().trim().min(1),
    fullText: z.string().trim().optional(),
  })
  .transform((value) => {
    const normalizedFeatures = value.features.map((feature) => feature.trim()).filter(Boolean);

    const fullText =
      value.fullText?.trim() ||
      [
        value.hook,
        "",
        value.body,
        "",
        ...normalizedFeatures.map((feature) => `- ${feature}`),
        "",
        value.cta,
      ]
        .join("\n")
        .trim();

    return {
      hook: value.hook.trim(),
      body: value.body.trim(),
      features: normalizedFeatures,
      cta: value.cta.trim(),
      fullText,
    };
  });

export type DescriptionGenerationOutput = z.infer<typeof descriptionOutputSchema>;

export async function generateAppStoreDescription(input: {
  project: DescriptionPromptProjectContext;
  model?: string;
  temperature?: number;
}): Promise<{
  content: DescriptionGenerationOutput;
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const prompts = buildDescriptionPrompt(input.project);

  const completion = await requestOpenRouterJson<DescriptionGenerationOutput>({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: input.model,
    temperature: input.temperature,
  });

  const parsed = descriptionOutputSchema.safeParse(completion.data);

  if (!parsed.success) {
    throw new Error("OpenRouter returned invalid description JSON structure");
  }

  return {
    content: parsed.data,
    model: completion.model,
    prompt: prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}
