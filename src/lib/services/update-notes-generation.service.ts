import { z } from "zod";
import {
  buildUpdateNotesPrompt,
  UpdateNotesMode,
  UpdateNotesPromptProjectContext,
} from "@/src/lib/prompts/update-notes.builder";
import { requestOpenRouterJson } from "@/src/lib/services/openrouter.service";

const outputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: z.array(z.string().trim().min(1)).min(1),
});

export type UpdateNotesGenerationOutput = z.infer<typeof outputSchema>;

function normalizeNotes(notes: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const note of notes) {
    const normalized = note.trim().replace(/\s+/g, " ");
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

export async function generateUpdateNotes(input: {
  project: UpdateNotesPromptProjectContext;
  mode: UpdateNotesMode;
  model?: string;
  temperature?: number;
}): Promise<{
  content: UpdateNotesGenerationOutput;
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const prompts = buildUpdateNotesPrompt(input.project, input.mode);

  const completion = await requestOpenRouterJson<unknown>({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: input.model,
    temperature: input.temperature,
  });

  const parsed = outputSchema.safeParse(completion.data);

  if (!parsed.success) {
    throw new Error("OpenRouter returned invalid update notes JSON structure");
  }

  const normalizedNotes = normalizeNotes(parsed.data.notes);

  if (normalizedNotes.length === 0) {
    throw new Error("No update notes were generated");
  }

  return {
    content: {
      title: parsed.data.title.trim(),
      notes: normalizedNotes,
    },
    model: completion.model,
    prompt: prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}
