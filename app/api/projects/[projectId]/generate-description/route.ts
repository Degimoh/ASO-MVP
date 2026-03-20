import { AssetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { getDemoUser } from "@/src/lib/repositories/user.repository";
import { createVersionedGenerationResult } from "@/src/lib/repositories/generation.repository";
import { getProjectById } from "@/src/lib/repositories/project.repository";
import { generateAppStoreDescription } from "@/src/lib/services/description-generation.service";
import { OpenRouterServiceError } from "@/src/lib/services/openrouter.service";

const payloadSchema = z.object({
  model: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const startedAt = Date.now();
  const { projectId } = await params;
  const user = await getDemoUser();

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

    const project = await getProjectById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const generated = await generateAppStoreDescription({
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

    const record = await createVersionedGenerationResult({
      projectId: project.id,
      type: AssetType.DESCRIPTION,
      locale: project.primaryLanguage,
      prompt: generated.prompt,
      model: generated.model,
      content: generated.content,
    });

    if (user) {
      await writeUsageLog({
        userId: user.id,
        projectId: project.id,
        action: "generate_description",
        status: "success",
        model: generated.model,
        latencyMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json({
      data: {
        generationId: record.id,
        version: record.version,
        model: record.model,
        content: generated.content,
      },
    });
  } catch (error) {
    if (user) {
      await writeUsageLog({
        userId: user.id,
        projectId,
        action: "generate_description",
        status: "error",
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof OpenRouterServiceError) {
      const status = error.status && error.status >= 400 ? 502 : 500;

      return NextResponse.json(
        {
          error: "Description generation failed",
          details: error.message,
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: "Description generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
