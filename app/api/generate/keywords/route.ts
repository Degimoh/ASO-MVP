import { AssetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import {
  createVersionedGenerationResultAndDebitCredits,
} from "@/src/lib/repositories/generation.repository";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";
import { generateKeywords } from "@/src/lib/services/keywords-generation.service";
import { OpenRouterServiceError } from "@/src/lib/services/openrouter.service";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";
import { getAssetGenerationCreditCost } from "@/src/lib/wallet/generation-pricing";

const payloadSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }
  const user = auth.user;

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

    const project = await getProjectByIdForUser(parsedBody.data.projectId, user.id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const generated = await generateKeywords({
      project: {
        appName: project.appName,
        platform: project.platform,
        category: project.category,
        appSummary: project.appSummary,
        coreFeatures: project.features.map((feature) => feature.value),
        targetAudience: project.targetAudience,
        toneOfVoice: project.toneOfVoice,
        primaryLanguage: project.primaryLanguage,
        targetLocales: project.locales.map((locale) => locale.code),
        competitors: project.competitors,
        importantKeywords: project.importantKeywords,
      },
      model: parsedBody.data.model,
      temperature: parsedBody.data.temperature,
    });

    const charged = await createVersionedGenerationResultAndDebitCredits({
      userId: user.id,
      projectId: project.id,
      type: AssetType.KEYWORDS,
      locale: project.primaryLanguage,
      prompt: generated.prompt,
      model: generated.model,
      content: generated.content,
      creditsCost: getAssetGenerationCreditCost(AssetType.KEYWORDS),
      ledgerDescription: "Generated keyword set",
    });
    const record = charged.generation;

    await writeUsageLog({
      userId: user.id,
      projectId: project.id,
      action: "generate_keywords",
      status: "success",
      model: generated.model,
      latencyMs: Date.now() - startedAt,
      metadata: {
        creditsCharged: charged.chargedCredits,
        walletBalanceAfter: charged.balanceAfter,
      },
    });

    return NextResponse.json({
      data: {
        generationId: record.id,
        version: record.version,
        locale: record.locale,
        model: record.model,
        generatedAt: record.generatedAt.toISOString(),
        creditsCharged: charged.chargedCredits,
        walletBalanceAfter: charged.balanceAfter,
        content: generated.content,
      },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await writeUsageLog({
        userId: user.id,
        action: "generate_keywords",
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
      userId: user.id,
      action: "generate_keywords",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof OpenRouterServiceError) {
      return NextResponse.json(
        {
          error: "Keyword generation failed",
          details: error.message,
        },
        { status: error.status && error.status >= 400 ? 502 : 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Keyword generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
