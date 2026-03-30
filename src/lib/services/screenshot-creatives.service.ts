import { z } from "zod";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Platform } from "@prisma/client";
import {
  resolveScreenshotCreativeModelCandidates,
} from "@/src/lib/screenshot-creatives/models";
import {
  buildScreenshotCreativesPrompt,
  ScreenshotCreativePromptInput,
} from "@/src/lib/prompts/screenshot-creatives.builder";
import {
  OpenRouterServiceError,
  requestOpenRouterJson,
  type OpenRouterMessageContentPart,
} from "@/src/lib/services/openrouter.service";

const TARGET_WIDTH = 1284;
const TARGET_HEIGHT = 2778;

const overlaySchema = z.object({
  items: z
    .array(
      z.object({
        headline: z.string().trim().min(6).max(64),
        subheadline: z.string().trim().min(12).max(140),
      }),
    )
    .min(1),
});

type OverlayItem = {
  headline: string;
  subheadline: string;
};

export type ScreenshotCreativeProjectContext = {
  appName: string;
  platform: Platform;
  category: string;
  appSummary: string;
  coreFeatures: string[];
  targetAudience: string;
  toneOfVoice: string;
  primaryLanguage: string;
  importantKeywords: string[];
};

export type ScreenshotCreativeGenerationInput = {
  project: ScreenshotCreativeProjectContext;
  existingCaptions?: string[];
  screenshotCount: number;
  screenshotSpecificContext?: string;
  screenshotImages?: Array<{
    mimeType: string;
    base64Data: string;
  }>;
  model?: string;
  temperature?: number;
};

export type ScreenshotCreativeImageInput = {
  sourceBuffer: Buffer;
  headline: string;
  subheadline: string;
  projectId: string;
  screenshotId: string;
  index: number;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxCharsPerLine: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

function buildOverlaySvg(input: { headline: string; subheadline: string }) {
  const headlineLines = wrapText(input.headline, 24);
  const subheadlineLines = wrapText(input.subheadline, 34);
  const headlineStartY = 280;
  const subheadlineStartY = headlineStartY + headlineLines.length * 82 + 44;

  const headlineText = headlineLines
    .map(
      (line, index) =>
        `<tspan x="88" dy="${index === 0 ? 0 : 82}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const subheadlineText = subheadlineLines
    .map(
      (line, index) =>
        `<tspan x="92" dy="${index === 0 ? 0 : 54}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return Buffer.from(
    `<svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" viewBox="0 0 ${TARGET_WIDTH} ${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(2,6,23,0.75)" />
      <stop offset="100%" stop-color="rgba(2,6,23,0)" />
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(2,6,23,0)" />
      <stop offset="100%" stop-color="rgba(2,6,23,0.75)" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" fill="url(#topFade)" />
  <rect x="0" y="0" width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" fill="url(#bottomFade)" />
  <rect x="64" y="188" width="${TARGET_WIDTH - 128}" height="560" rx="40" fill="rgba(15,23,42,0.35)" />
  <text x="88" y="${headlineStartY}" fill="#ffffff" font-size="66" font-weight="700" font-family="Inter, Arial, sans-serif">${headlineText}</text>
  <text x="92" y="${subheadlineStartY}" fill="rgba(241,245,249,0.98)" font-size="42" font-weight="500" font-family="Inter, Arial, sans-serif">${subheadlineText}</text>
</svg>`,
    "utf-8",
  );
}

export async function generateScreenshotCreativeOverlays(
  input: ScreenshotCreativeGenerationInput,
): Promise<{
  items: OverlayItem[];
  model: string;
  prompt: string;
  rawResponse: string;
}> {
  const prompts = buildScreenshotCreativesPrompt({
    ...input.project,
    existingCaptions: input.existingCaptions ?? [],
    screenshotCount: input.screenshotCount,
    screenshotSpecificContext: input.screenshotSpecificContext,
  } satisfies ScreenshotCreativePromptInput);

  const hasImageInputs =
    Array.isArray(input.screenshotImages) &&
    input.screenshotImages.length > 0 &&
    input.screenshotImages.every(
      (item) =>
        typeof item.mimeType === "string" &&
        item.mimeType.trim().length > 0 &&
        typeof item.base64Data === "string" &&
        item.base64Data.trim().length > 0,
    );

  let userPrompt: string | OpenRouterMessageContentPart[] = prompts.userPrompt;
  if (hasImageInputs) {
    const imageGuidance = [
      "Use the attached screenshot(s) as visual input.",
      "Create overlay copy that matches visible app flows/features from the screenshot.",
      `Return exactly ${input.screenshotCount} items in the required JSON schema.`,
    ].join(" ");

    userPrompt = [
      { type: "text", text: `${prompts.userPrompt}\n\n${imageGuidance}` },
      ...(input.screenshotImages ?? []).map((image) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${image.mimeType};base64,${image.base64Data}`,
        },
      })),
    ];
  }

  const modelCandidates = resolveScreenshotCreativeModelCandidates(input.model);
  let completion: Awaited<ReturnType<typeof requestOpenRouterJson<unknown>>> | null = null;
  let lastError: unknown = null;

  for (const candidateModel of modelCandidates) {
    try {
      completion = await requestOpenRouterJson<unknown>({
        systemPrompt: prompts.systemPrompt,
        userPrompt,
        model: candidateModel,
        temperature: input.temperature,
      });
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof OpenRouterServiceError)) {
        throw error;
      }
    }
  }

  if (!completion) {
    throw (
      lastError ??
      new Error("Unable to generate screenshot creatives with Nano Banana models")
    );
  }

  const parsed = overlaySchema.safeParse(completion.data);
  if (!parsed.success) {
    throw new Error("OpenRouter returned invalid screenshot creative JSON structure");
  }

  const exactItems = parsed.data.items.slice(0, input.screenshotCount);
  if (exactItems.length !== input.screenshotCount) {
    throw new Error("OpenRouter did not return enough creative items");
  }

  return {
    items: exactItems.map((item) => ({
      headline: item.headline.trim(),
      subheadline: item.subheadline.trim(),
    })),
    model: completion.model,
    prompt: typeof userPrompt === "string" ? userPrompt : prompts.userPrompt,
    rawResponse: completion.rawContent,
  };
}

export async function buildScreenshotCreativePng(
  input: ScreenshotCreativeImageInput,
): Promise<{
  outputPath: string;
  width: number;
  height: number;
}> {
  const resizedBase = await sharp(input.sourceBuffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "center",
    })
    .png()
    .toBuffer();

  const overlaySvg = buildOverlaySvg({
    headline: input.headline,
    subheadline: input.subheadline,
  });

  const outputBuffer = await sharp(resizedBase)
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png({ quality: 92 })
    .toBuffer();

  const filename = `creative-${input.projectId}-${input.screenshotId}-${input.index}-${createHash("sha1")
    .update(`${Date.now()}-${input.headline}-${input.subheadline}`)
    .digest("hex")
    .slice(0, 10)}.png`;
  const outputRelativePath = `generated/screenshot-creatives/${filename}`;
  const outputAbsolutePath = path.join(process.cwd(), "public", outputRelativePath);
  await mkdir(path.dirname(outputAbsolutePath), { recursive: true });

  await writeFile(outputAbsolutePath, outputBuffer);

  return {
    outputPath: `/${outputRelativePath}`,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };
}
