import { NextResponse } from "next/server";
import { updateGenerationResultForUser } from "@/lib/repositories/generation-repository";
import { updateGenerationSchema } from "@/lib/validations/project";
import { requireApiUser } from "@/src/lib/auth/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  try {
    const auth = await requireApiUser();
    if (!auth.user) {
      return auth.unauthorizedResponse;
    }

    const { generationId } = await params;
    const body = await request.json();
    const parsed = updateGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateGenerationResultForUser(generationId, auth.user.id, parsed.data.content);

    if (!updated) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

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
