import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

type OpenRouterOptions = {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
};

export async function generateStructuredContent({
  systemPrompt,
  userPrompt,
  model,
  temperature,
}: OpenRouterOptions): Promise<{ content: Record<string, unknown>; model: string }> {
  const result = await requestOpenRouterJson<Record<string, unknown>>({
    systemPrompt,
    userPrompt,
    model,
    temperature,
  });

  if (!result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    throw new Error("Model output was not valid JSON object");
  }

  return {
    content: result.data,
    model: result.model,
  };
}
