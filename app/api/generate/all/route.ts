import { NextResponse } from "next/server";
import { z } from "zod";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import {
  createVersionedGenerationResultAndDebitCredits,
} from "@/src/lib/repositories/generation.repository";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";
import { generateAppStoreDescription } from "@/src/lib/services/description-generation.service";
import { generateKeywords } from "@/src/lib/services/keywords-generation.service";
import { generateScreenshotCaptions } from "@/src/lib/services/captions-generation.service";
import { generateUpdateNotes } from "@/src/lib/services/update-notes-generation.service";
import { AssetType } from "@prisma/client";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";
import { getAssetGenerationCreditCost } from "@/src/lib/wallet/generation-pricing";

const payloadSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  updateNotesMode: z
    .enum(["bug-fix", "minor-update", "feature-release", "major-release"])
    .optional()
    .default("minor-update"),
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

type GenerationResultPayload =
  | {
      status: "success";
      generationId: string;
      version: number;
      locale: string | null;
      model: string;
      generatedAt: string;
      creditsCharged: number;
      walletBalanceAfter: number;
      content: Record<string, unknown>;
    }
  | {
      status: "error";
      error: string;
    };

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
    const projectRecord = project;

    const sharedProjectContext = {
      appName: projectRecord.appName,
      platform: projectRecord.platform,
      category: projectRecord.category,
      appSummary: projectRecord.appSummary,
      coreFeatures: projectRecord.features.map((feature) => feature.value),
      targetAudience: projectRecord.targetAudience,
      toneOfVoice: projectRecord.toneOfVoice,
      primaryLanguage: projectRecord.primaryLanguage,
      targetLocales: projectRecord.locales.map((locale) => locale.code),
      competitors: projectRecord.competitors,
      importantKeywords: projectRecord.importantKeywords,
    };

    async function runAssetGeneration(input: {
      key: "description" | "keywords" | "screenshotCaptions" | "updateNotes";
      action: string;
      assetType: AssetType;
      run: () => Promise<{
        content: Record<string, unknown>;
        model: string;
        prompt: string;
      }>;
    }): Promise<GenerationResultPayload> {
      const assetStartedAt = Date.now();

      try {
        const generated = await input.run();

        const charged = await createVersionedGenerationResultAndDebitCredits({
          userId: user.id,
          projectId: projectRecord.id,
          type: input.assetType,
          locale: projectRecord.primaryLanguage,
          prompt: generated.prompt,
          model: generated.model,
          content: generated.content,
          creditsCost: getAssetGenerationCreditCost(input.assetType),
          ledgerDescription: `Generated ${input.assetType.replaceAll("_", " ").toLowerCase()}`,
        });
        const record = charged.generation;

        await writeUsageLog({
          userId: user.id,
          projectId: projectRecord.id,
          action: input.action,
          status: "success",
          model: generated.model,
          latencyMs: Date.now() - assetStartedAt,
          metadata: {
            creditsCharged: charged.chargedCredits,
            walletBalanceAfter: charged.balanceAfter,
          },
        });

        return {
          status: "success",
          generationId: record.id,
          version: record.version,
          locale: record.locale,
          model: record.model,
          generatedAt: record.generatedAt.toISOString(),
          creditsCharged: charged.chargedCredits,
          walletBalanceAfter: charged.balanceAfter,
          content: generated.content,
        };
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          await writeUsageLog({
            userId: user.id,
            projectId: projectRecord.id,
            action: input.action,
            status: "insufficient_credits",
            latencyMs: Date.now() - assetStartedAt,
            error: error.message,
          });

          return {
            status: "error",
            error: `Insufficient credits (need ${error.required}, available ${error.available})`,
          };
        }

        await writeUsageLog({
          userId: user.id,
          projectId: projectRecord.id,
          action: input.action,
          status: "error",
          latencyMs: Date.now() - assetStartedAt,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    const [description, keywords, screenshotCaptions, updateNotes] = await Promise.all([
      runAssetGeneration({
        key: "description",
        action: "generate_all_description",
        assetType: AssetType.DESCRIPTION,
        run: async () =>
          generateAppStoreDescription({
            project: sharedProjectContext,
            model: parsedBody.data.model,
            temperature: parsedBody.data.temperature,
          }),
      }),
      runAssetGeneration({
        key: "keywords",
        action: "generate_all_keywords",
        assetType: AssetType.KEYWORDS,
        run: async () =>
          generateKeywords({
            project: sharedProjectContext,
            model: parsedBody.data.model,
            temperature: parsedBody.data.temperature,
          }),
      }),
      runAssetGeneration({
        key: "screenshotCaptions",
        action: "generate_all_screenshot_captions",
        assetType: AssetType.SCREENSHOT_CAPTIONS,
        run: async () =>
          generateScreenshotCaptions({
            project: sharedProjectContext,
            model: parsedBody.data.model,
            temperature: parsedBody.data.temperature,
          }),
      }),
      runAssetGeneration({
        key: "updateNotes",
        action: "generate_all_update_notes",
        assetType: AssetType.UPDATE_NOTES,
        run: async () =>
          generateUpdateNotes({
            project: sharedProjectContext,
            mode: parsedBody.data.updateNotesMode,
            model: parsedBody.data.model,
            temperature: parsedBody.data.temperature,
          }),
      }),
    ]);

    const assets = {
      description,
      keywords,
      screenshotCaptions,
      updateNotes,
    };

    const values = Object.values(assets);
    const successCount = values.filter((asset) => asset.status === "success").length;
    const failureCount = values.length - successCount;
    const chargedCredits = values.reduce((sum, asset) => {
      if (asset.status !== "success") {
        return sum;
      }

      return sum + asset.creditsCharged;
    }, 0);

    await writeUsageLog({
      userId: user.id,
      projectId: projectRecord.id,
      action: "generate_all_assets",
      status: failureCount === 0 ? "success" : successCount === 0 ? "error" : "partial",
      latencyMs: Date.now() - startedAt,
      metadata: {
        chargedCredits,
      },
    });

    return NextResponse.json({
      data: {
        projectId: projectRecord.id,
        assets,
        summary: {
          successCount,
          failureCount,
          chargedCredits,
        },
      },
    });
  } catch (error) {
    await writeUsageLog({
      userId: user.id,
      action: "generate_all_assets",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Generate all flow failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
