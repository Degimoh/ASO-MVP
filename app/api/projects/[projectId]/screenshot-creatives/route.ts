import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectWorkspaceByIdForUser } from "@/src/lib/repositories/project.repository";
import {
  createScreenshotCreativesBatchAndDebitCredits,
  listProjectScreenshotsByIdsForUser,
  listProjectScreenshotsByProjectIdForUser,
} from "@/src/lib/repositories/screenshot.repository";
import {
  buildScreenshotCreativePng,
  generateScreenshotCreativeOverlays,
} from "@/src/lib/services/screenshot-creatives.service";
import { OpenRouterServiceError } from "@/src/lib/services/openrouter.service";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";
import { SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE } from "@/src/lib/wallet/generation-pricing";

const payloadSchema = z.object({
  screenshotIds: z.array(z.string().trim().min(1)).min(1).optional(),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

function parseCaptionsFromGenerationContent(content: unknown): string[] {
  if (typeof content !== "object" || content === null) {
    return [];
  }

  if (!("captions" in content) || !Array.isArray((content as { captions?: unknown }).captions)) {
    return [];
  }

  return ((content as { captions: unknown[] }).captions || [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId } = await params;
  const project = await getProjectWorkspaceByIdForUser(projectId, auth.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const screenshots = await listProjectScreenshotsByProjectIdForUser(projectId, auth.user.id);

  return NextResponse.json({
    data: screenshots.flatMap((screenshot) =>
      screenshot.creatives.map((creative) => ({
        id: creative.id,
        screenshotId: screenshot.id,
        screenshotPath: `/api/projects/${projectId}/screenshots/${screenshot.id}/file`,
        status: creative.status,
        headline: creative.headline,
        subheadline: creative.subheadline,
        storagePath: creative.storagePath
          ? `/api/projects/${projectId}/screenshot-creatives/${creative.id}/file`
          : null,
        width: creative.width,
        height: creative.height,
        creditsCharged: creative.creditsCharged,
        generatedAt: creative.generatedAt.toISOString(),
      })),
    ),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const startedAt = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = payloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          issues: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { projectId } = await params;
    const project = await getProjectWorkspaceByIdForUser(projectId, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const requestedIds = parsedBody.data.screenshotIds;
    const screenshots =
      requestedIds && requestedIds.length > 0
        ? await listProjectScreenshotsByIdsForUser({
            projectId: project.id,
            userId: auth.user.id,
            screenshotIds: requestedIds,
          })
        : await listProjectScreenshotsByProjectIdForUser(project.id, auth.user.id);

    if (screenshots.length === 0) {
      return NextResponse.json({ error: "No screenshots available for generation" }, { status: 400 });
    }

    const latestCaptionGeneration = project.generationResults.find((item) => item.type === "SCREENSHOT_CAPTIONS");
    const existingCaptions = latestCaptionGeneration
      ? parseCaptionsFromGenerationContent(latestCaptionGeneration.content)
      : [];

    const overlayResult = await generateScreenshotCreativeOverlays({
      project: {
        appName: project.appName,
        platform: project.platform,
        category: project.category,
        appSummary: project.appSummary,
        coreFeatures: project.features.map((feature) => feature.value),
        targetAudience: project.targetAudience,
        toneOfVoice: project.toneOfVoice,
        primaryLanguage: project.primaryLanguage,
        importantKeywords: project.importantKeywords,
      },
      existingCaptions,
      screenshotCount: screenshots.length,
      model: parsedBody.data.model,
      temperature: parsedBody.data.temperature,
    });

    const creativeImages: Array<{
      screenshotId: string;
      screenshotPath: string;
      headline: string;
      subheadline: string;
      storagePath: string;
      width: number;
      height: number;
    }> = [];
    for (let index = 0; index < screenshots.length; index += 1) {
      const screenshot = screenshots[index];
      const overlay = overlayResult.items[index];
      const sourceAbsolutePath = path.join(process.cwd(), "public", screenshot.storagePath.replace(/^\//, ""));
      const sourceBuffer = await readFile(sourceAbsolutePath);
      const rendered = await buildScreenshotCreativePng({
        sourceBuffer,
        headline: overlay.headline,
        subheadline: overlay.subheadline,
        projectId: project.id,
        screenshotId: screenshot.id,
        index,
      });

      creativeImages.push({
        screenshotId: screenshot.id,
        screenshotPath: screenshot.storagePath,
        headline: overlay.headline,
        subheadline: overlay.subheadline,
        storagePath: rendered.outputPath,
        width: rendered.width,
        height: rendered.height,
      });
    }

    const charged = await createScreenshotCreativesBatchAndDebitCredits({
      userId: auth.user.id,
      projectId: project.id,
      prompt: overlayResult.prompt,
      model: overlayResult.model,
      creditsPerImage: SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE,
      items: creativeImages.map((item) => ({
        screenshotId: item.screenshotId,
        headline: item.headline,
        subheadline: item.subheadline,
        storagePath: item.storagePath,
        width: item.width,
        height: item.height,
      })),
    });

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "generate_screenshot_creatives",
      status: "success",
      model: overlayResult.model,
      latencyMs: Date.now() - startedAt,
      metadata: {
        generatedCount: charged.creatives.length,
        creditsCharged: charged.chargedCredits,
        walletBalanceAfter: charged.balanceAfter,
      },
    });

    return NextResponse.json({
      data: {
        generatedCount: charged.creatives.length,
        creditsCharged: charged.chargedCredits,
        creditsPerImage: SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE,
        walletBalanceAfter: charged.balanceAfter,
        items: charged.creatives.map((creative) => ({
          id: creative.id,
          screenshotId: creative.screenshotId,
          screenshotPath: `/api/projects/${projectId}/screenshots/${creative.screenshotId}/file`,
          headline: creative.headline,
          subheadline: creative.subheadline,
          storagePath: creative.storagePath
            ? `/api/projects/${projectId}/screenshot-creatives/${creative.id}/file`
            : null,
          width: creative.width,
          height: creative.height,
          generatedAt: creative.generatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await writeUsageLog({
        userId: auth.user.id,
        action: "generate_screenshot_creatives",
        status: "insufficient_credits",
        latencyMs: Date.now() - startedAt,
        error: error.message,
      });

      return NextResponse.json(
        {
          error: "Insufficient credits",
          details: `You need ${error.required} credits but only have ${error.available}.`,
          code: "INSUFFICIENT_CREDITS",
          requiredCredits: error.required,
          availableCredits: error.available,
        },
        { status: 402 },
      );
    }

    await writeUsageLog({
      userId: auth.user.id,
      action: "generate_screenshot_creatives",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof OpenRouterServiceError) {
      return NextResponse.json(
        {
          error: "Screenshot creatives generation failed",
          details: error.message,
        },
        { status: error.status && error.status >= 400 ? 502 : 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Screenshot creatives generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
