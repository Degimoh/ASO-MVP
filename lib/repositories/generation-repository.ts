import { GenerationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createGenerationResult(input: {
  projectId: string;
  type: GenerationType;
  locale?: string;
  prompt: string;
  model: string;
  content: Record<string, unknown>;
}) {
  return prisma.generationResult.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      locale: input.locale,
      prompt: input.prompt,
      model: input.model,
      content: input.content as Prisma.InputJsonValue,
    },
  });
}

export async function updateGenerationResult(generationId: string, content: Record<string, unknown>) {
  return prisma.generationResult.update({
    where: { id: generationId },
    data: {
      content: content as Prisma.InputJsonValue,
    },
  });
}

export async function updateGenerationResultForUser(
  generationId: string,
  userId: string,
  content: Record<string, unknown>,
) {
  const existing = await prisma.generationResult.findFirst({
    where: {
      id: generationId,
      project: {
        userId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.generationResult.update({
    where: { id: generationId },
    data: {
      content: content as Prisma.InputJsonValue,
    },
  });
}

export async function writeUsageLog(input: {
  userId: string;
  projectId?: string;
  action: string;
  status: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}) {
  return prisma.usageLog.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      action: input.action,
      status: input.status,
      model: input.model,
      latencyMs: input.latencyMs,
      error: input.error,
    },
  });
}
