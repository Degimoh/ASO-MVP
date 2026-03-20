import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId } = await params;
  const project = await getProjectByIdForUser(projectId, auth.user.id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
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
  });
}
