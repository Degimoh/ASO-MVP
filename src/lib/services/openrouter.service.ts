const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;

type OpenRouterConfig = {
  apiKey: string;
  defaultModel: string;
  siteUrl: string;
  siteName: string;
};

export type OpenRouterChatCompletionInput = {
  systemPrompt: string;
  userPrompt: string | OpenRouterMessageContentPart[];
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

export type OpenRouterChatCompletionResult = {
  id: string | null;
  model: string;
  rawContent: string;
  parsedJson: unknown | null;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

type OpenRouterApiResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    code?: string;
  };
};

export class OpenRouterServiceError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "OpenRouterServiceError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function resolveConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenRouterServiceError("OPENROUTER_API_KEY is not configured");
  }

  return {
    apiKey,
    defaultModel: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
    siteName: process.env.OPENROUTER_SITE_NAME?.trim() || "AI ASO Generator",
  };
}

function normalizeTemperature(temperature: number | undefined) {
  if (typeof temperature !== "number" || Number.isNaN(temperature)) {
    return DEFAULT_TEMPERATURE;
  }

  return Math.min(2, Math.max(0, temperature));
}

function normalizePrompt(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new OpenRouterServiceError(`${label} cannot be empty`);
  }

  return trimmed;
}

export type OpenRouterMessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type OpenRouterTextPart = Extract<OpenRouterMessageContentPart, { type: "text" }>;

function extractMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .filter(
        (part): part is OpenRouterTextPart =>
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string",
      )
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new OpenRouterServiceError("OpenRouter response did not contain text content");
}

function extractJsonCandidate(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = new Set<string>([trimmed]);

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.add(fencedMatch[1].trim());
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    candidates.add(objectMatch[0].trim());
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    candidates.add(arrayMatch[0].trim());
  }

  return [...candidates].filter(Boolean);
}

export function safeParseJson(raw: string): unknown | null {
  const candidates = extractJsonCandidate(raw);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function parseErrorResponse(response: Response): Promise<{
  message: string;
  code?: string;
  details: string;
}> {
  const body = await response.text();

  try {
    const json = JSON.parse(body) as OpenRouterApiResponse;
    const message = json.error?.message || `OpenRouter request failed with status ${response.status}`;
    return {
      message,
      code: json.error?.code,
      details: body,
    };
  } catch {
    return {
      message: `OpenRouter request failed with status ${response.status}`,
      details: body,
    };
  }
}

export async function requestOpenRouterChatCompletion(
  input: OpenRouterChatCompletionInput,
): Promise<OpenRouterChatCompletionResult> {
  const config = resolveConfig();
  const systemPrompt = normalizePrompt(input.systemPrompt, "System prompt");
  const userPrompt =
    typeof input.userPrompt === "string"
      ? normalizePrompt(input.userPrompt, "User prompt")
      : input.userPrompt;
  const model = input.model?.trim() || config.defaultModel;
  const temperature = normalizeTemperature(input.temperature);
  const userContent = userPrompt;

  let response: Response;

  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.siteUrl,
        "X-Title": config.siteName,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: input.signal,
    });
  } catch (error) {
    throw new OpenRouterServiceError("Failed to reach OpenRouter", {
      cause: error,
    });
  }

  if (!response.ok) {
    const parsedError = await parseErrorResponse(response);

    throw new OpenRouterServiceError(parsedError.message, {
      status: response.status,
      code: parsedError.code,
      details: parsedError.details,
    });
  }

  let payload: OpenRouterApiResponse;

  try {
    payload = (await response.json()) as OpenRouterApiResponse;
  } catch (error) {
    throw new OpenRouterServiceError("OpenRouter returned invalid JSON response", {
      cause: error,
    });
  }

  const rawContent = extractMessageContent(payload.choices?.[0]?.message?.content);

  return {
    id: payload.id || null,
    model: payload.model || model,
    rawContent,
    parsedJson: safeParseJson(rawContent),
    usage: {
      promptTokens: payload.usage?.prompt_tokens,
      completionTokens: payload.usage?.completion_tokens,
      totalTokens: payload.usage?.total_tokens,
    },
  };
}

export async function requestOpenRouterJson<T>(
  input: OpenRouterChatCompletionInput,
): Promise<{
  data: T | null;
  rawContent: string;
  model: string;
}> {
  const result = await requestOpenRouterChatCompletion(input);

  return {
    data: (result.parsedJson as T | null) ?? null,
    rawContent: result.rawContent,
    model: result.model,
  };
}
