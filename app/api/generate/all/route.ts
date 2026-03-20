import { NextResponse } from "next/server";
import { z } from "zod";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { createVersionedGenerationResult } from "@/src/lib/repositories/generation.repository";
import { getProjectById } from "@/src/lib/repositories/project.repository";
import { getOrCreateDemoUser } from "@/src/lib/repositories/user.repository";
import { generateAppStoreDescription } from "@/src/lib/services/description-generation.service";
import { generateKeywords } from "@/src/lib/services/keywords-generation.service";
import { generateScreenshotCaptions } from "@/src/lib/services/captions-generation.service";
import { generateUpdateNotes } from "@/src/lib/services/update-notes-generation.service";
import { AssetType } from "@prisma/client";

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
      content: Record<string, unknown>;
    }
  | {
      status: "error";
      error: string;
    };

export async function POST(request: Request) {
  const startedAt = Date.now();
  const user = await getOrCreateDemoUser();

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

    const project = await getProjectById(parsedBody.data.projectId);

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

        const record = await createVersionedGenerationResult({
          projectId: projectRecord.id,
          type: input.assetType,
          locale: projectRecord.primaryLanguage,
          prompt: generated.prompt,
          model: generated.model,
          content: generated.content,
        });

        await writeUsageLog({
          userId: user.id,
          projectId: projectRecord.id,
          action: input.action,
          status: "success",
          model: generated.model,
          latencyMs: Date.now() - assetStartedAt,
        });

        return {
          status: "success",
          generationId: record.id,
          version: record.version,
          locale: record.locale,
          model: record.model,
          generatedAt: record.generatedAt.toISOString(),
          content: generated.content,
        };
      } catch (error) {
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

    await writeUsageLog({
      userId: user.id,
      projectId: projectRecord.id,
      action: "generate_all_assets",
      status: failureCount === 0 ? "success" : successCount === 0 ? "error" : "partial",
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      data: {
        projectId: projectRecord.id,
        assets,
        summary: {
          successCount,
          failureCount,
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
