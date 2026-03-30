import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectWorkspaceByIdForUser } from "@/src/lib/repositories/project.repository";
import {
  createScreenshotCreativesBatchAndDebitCredits,
  getLatestScreenshotCreativeByScreenshotIdForUser,
  getProjectScreenshotByIdForUser,
} from "@/src/lib/repositories/screenshot.repository";
import {
  buildScreenshotCreativePng,
  generateScreenshotCreativeOverlays,
} from "@/src/lib/services/screenshot-creatives.service";
import { OpenRouterServiceError } from "@/src/lib/services/openrouter.service";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";
import { SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE } from "@/src/lib/wallet/generation-pricing";

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; screenshotId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const startedAt = Date.now();

  try {
    const { projectId, screenshotId } = await params;
    const project = await getProjectWorkspaceByIdForUser(projectId, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const screenshot = await getProjectScreenshotByIdForUser({
      screenshotId,
      userId: auth.user.id,
    });
    if (!screenshot || screenshot.projectId !== project.id) {
      return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
    }

    const previousCreative = await getLatestScreenshotCreativeByScreenshotIdForUser({
      screenshotId,
      userId: auth.user.id,
    });

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
      screenshotCount: 1,
    });

    const overlay = overlayResult.items[0];
    const sourceAbsolutePath = path.join(process.cwd(), "public", screenshot.storagePath.replace(/^\//, ""));
    const sourceBuffer = await readFile(sourceAbsolutePath);
    const rendered = await buildScreenshotCreativePng({
      sourceBuffer,
      headline: overlay.headline,
      subheadline: overlay.subheadline,
      projectId: project.id,
      screenshotId: screenshot.id,
      index: 0,
    });

    const charged = await createScreenshotCreativesBatchAndDebitCredits({
      userId: auth.user.id,
      projectId: project.id,
      prompt: overlayResult.prompt,
      model: overlayResult.model,
      creditsPerImage: SCREENSHOT_CREATIVE_CREDITS_PER_IMAGE,
      items: [
        {
          screenshotId: screenshot.id,
          headline: overlay.headline,
          subheadline: overlay.subheadline,
          storagePath: rendered.outputPath,
          width: rendered.width,
          height: rendered.height,
        },
      ],
    });
    const creative = charged.creatives[0];

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "regenerate_screenshot_creative",
      status: "success",
      model: overlayResult.model,
      latencyMs: Date.now() - startedAt,
      metadata: {
        screenshotId: screenshot.id,
        previousCreativeId: previousCreative?.id ?? null,
        newCreativeId: creative.id,
        creditsCharged: charged.chargedCredits,
        walletBalanceAfter: charged.balanceAfter,
      },
    });

    return NextResponse.json({
      data: {
        id: creative.id,
        screenshotId: screenshot.id,
        screenshotPath: screenshot.storagePath,
        headline: creative.headline,
        subheadline: creative.subheadline,
        storagePath: creative.storagePath,
        width: creative.width,
        height: creative.height,
        generatedAt: creative.generatedAt.toISOString(),
        creditsCharged: charged.chargedCredits,
        walletBalanceAfter: charged.balanceAfter,
      },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await writeUsageLog({
        userId: auth.user.id,
        action: "regenerate_screenshot_creative",
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
      action: "regenerate_screenshot_creative",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof OpenRouterServiceError) {
      return NextResponse.json(
        {
          error: "Screenshot creative regeneration failed",
          details: error.message,
        },
        { status: error.status && error.status >= 400 ? 502 : 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Screenshot creative regeneration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
