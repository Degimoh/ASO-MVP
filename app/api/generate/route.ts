import { NextResponse } from "next/server";
import { createGenerationResult, writeUsageLog } from "@/lib/repositories/generation-repository";
import { generateAsoContent } from "@/lib/services/generation-service";
import { generatePayloadSchema } from "@/lib/validations/project";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }
  const user = auth.user;

  try {
    const body = await request.json();
    const parsed = generatePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid generation payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const project = await getProjectByIdForUser(parsed.data.projectId, user.id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const generated = await generateAsoContent({
      type: parsed.data.type,
      targetLocale: parsed.data.targetLocale,
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
    });

    const record = await createGenerationResult({
      projectId: project.id,
      type: parsed.data.type,
      locale: parsed.data.targetLocale,
      prompt: generated.prompt,
      model: generated.model,
      content: generated.content,
    });

    await writeUsageLog({
      userId: user.id,
      projectId: project.id,
      action: `generate_${parsed.data.type.toLowerCase()}`,
      status: generated.fallbackUsed ? "fallback" : "success",
      model: generated.model,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({ data: record });
  } catch (error) {
    await writeUsageLog({
      userId: user.id,
      action: "generate_failed",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
