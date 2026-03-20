import { AssetType, GenerationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export async function createVersionedGenerationResult(input: {
  projectId: string;
  type: AssetType;
  locale?: string | null;
  prompt: string;
  model: string;
  content: Prisma.InputJsonValue;
  status?: GenerationStatus;
  error?: string;
}) {
  const locale = input.locale ?? null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const latest = await tx.generationResult.findFirst({
          where: {
            projectId: input.projectId,
            type: input.type,
            locale,
          },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const nextVersion = (latest?.version ?? 0) + 1;

        return tx.generationResult.create({
          data: {
            projectId: input.projectId,
            type: input.type,
            locale,
            version: nextVersion,
            prompt: input.prompt,
            model: input.model,
            status: input.status ?? GenerationStatus.SUCCEEDED,
            error: input.error,
            content: input.content as Prisma.InputJsonValue,
          },
        });
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to create versioned generation result");
}

export type GenerationHistoryEntry = {
  id: string;
  projectId: string;
  type: AssetType;
  locale: string | null;
  version: number;
  model: string;
  generatedAt: Date;
  content: Prisma.JsonValue;
};

export async function restoreGenerationVersionById(generationId: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.generationResult.findUnique({
      where: { id: generationId },
      select: {
        id: true,
        projectId: true,
        type: true,
        locale: true,
        version: true,
        model: true,
        content: true,
      },
    });

    if (!source) {
      return null;
    }

    const latest = await tx.generationResult.findFirst({
      where: {
        projectId: source.projectId,
        type: source.type,
        locale: source.locale,
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const restored = await tx.generationResult.create({
      data: {
        projectId: source.projectId,
        type: source.type,
        locale: source.locale,
        version: (latest?.version ?? 0) + 1,
        prompt: `Restored from version ${source.version}`,
        model: source.model,
        status: GenerationStatus.SUCCEEDED,
        content: source.content as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        projectId: true,
        type: true,
        locale: true,
        version: true,
        model: true,
        generatedAt: true,
        content: true,
      },
    });

    return restored;
  });
}
