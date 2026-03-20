import { NextResponse } from "next/server";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { restoreGenerationVersionById } from "@/src/lib/repositories/generation.repository";
import { getOrCreateDemoUser } from "@/src/lib/repositories/user.repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  const startedAt = Date.now();
  const user = await getOrCreateDemoUser();
  const { generationId } = await params;

  try {
    const restored = await restoreGenerationVersionById(generationId);

    if (!restored) {
      return NextResponse.json({ error: "Generation version not found" }, { status: 404 });
    }

    await writeUsageLog({
      userId: user.id,
      projectId: restored.projectId,
      action: "restore_generation_version",
      status: "success",
      model: restored.model,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      data: {
        generationId: restored.id,
        projectId: restored.projectId,
        type: restored.type,
        locale: restored.locale,
        version: restored.version,
        model: restored.model,
        generatedAt: restored.generatedAt.toISOString(),
        content: restored.content,
      },
    });
  } catch (error) {
    await writeUsageLog({
      userId: user.id,
      action: "restore_generation_version",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Failed to restore generation version",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
