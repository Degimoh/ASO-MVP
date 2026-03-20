import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { createProject, listProjectsByUserId } from "@/src/lib/repositories/project.repository";
import { projectPayloadSchema } from "@/lib/validations/project";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const projects = await listProjectsByUserId(auth.user.id);

  return NextResponse.json({
    data: projects.map((project) => ({
      id: project.id,
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
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = projectPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const auth = await requireApiUser();
    if (!auth.user) {
      return auth.unauthorizedResponse;
    }

    const project = await createProject({
      userId: auth.user.id,
      appName: parsed.data.appName,
      platform: parsed.data.platform,
      category: parsed.data.category,
      appSummary: parsed.data.appSummary,
      coreFeatures: parsed.data.coreFeatures,
      targetAudience: parsed.data.targetAudience,
      toneOfVoice: parsed.data.toneOfVoice,
      primaryLanguage: parsed.data.primaryLanguage,
      targetLocales: parsed.data.targetLocales,
      competitors: parsed.data.competitors,
      importantKeywords: parsed.data.importantKeywords,
    });

    return NextResponse.json(
      {
        data: {
          id: project.id,
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
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
