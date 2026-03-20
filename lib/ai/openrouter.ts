const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterOptions = {
  systemPrompt: string;
  userPrompt: string;
};

function extractJson(text: string): Record<string, unknown> {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fencedMatch ? fencedMatch[1] : text;
  return JSON.parse(source) as Record<string, unknown>;
}

export async function generateStructuredContent({
  systemPrompt,
  userPrompt,
}: OpenRouterOptions): Promise<{ content: Record<string, unknown>; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "AI ASO Generator",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenRouter returned an empty response");
  }

  try {
    return {
      content: extractJson(raw),
      model,
    };
  } catch {
    throw new Error("Model output was not valid JSON");
  }
}
