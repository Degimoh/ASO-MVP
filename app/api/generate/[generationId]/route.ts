import { NextResponse } from "next/server";
import { updateGenerationResult } from "@/lib/repositories/generation-repository";
import { updateGenerationSchema } from "@/lib/validations/project";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  try {
    const { generationId } = await params;
    const body = await request.json();
    const parsed = updateGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateGenerationResult(generationId, parsed.data.content);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update generation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
