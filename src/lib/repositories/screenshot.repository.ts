import { Prisma, WalletLedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";

const screenshotInclude = {
  creatives: {
    orderBy: [{ generatedAt: "desc" as const }],
  },
} satisfies Prisma.ProjectScreenshotInclude;

export type ProjectScreenshotRecord = Prisma.ProjectScreenshotGetPayload<{
  include: typeof screenshotInclude;
}>;

export async function createProjectScreenshot(input: {
  projectId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  width?: number | null;
  height?: number | null;
}) {
  return prisma.projectScreenshot.create({
    data: {
      projectId: input.projectId,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      width: input.width ?? null,
      height: input.height ?? null,
    },
  });
}

export async function getProjectScreenshotByIdForUser(input: { screenshotId: string; userId: string }) {
  return prisma.projectScreenshot.findFirst({
    where: {
      id: input.screenshotId,
      project: {
        userId: input.userId,
      },
    },
    include: screenshotInclude,
  });
}

export async function listProjectScreenshotsByProjectIdForUser(projectId: string, userId: string) {
  return prisma.projectScreenshot.findMany({
    where: {
      projectId,
      project: {
        userId,
      },
    },
    include: screenshotInclude,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function listProjectScreenshotsByIdsForUser(input: {
  projectId: string;
  userId: string;
  screenshotIds: string[];
}) {
  return prisma.projectScreenshot.findMany({
    where: {
      id: {
        in: input.screenshotIds,
      },
      projectId: input.projectId,
      project: {
        userId: input.userId,
      },
    },
    include: screenshotInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function deleteProjectScreenshotByIdForUser(input: { screenshotId: string; userId: string }) {
  const screenshot = await prisma.projectScreenshot.findFirst({
    where: {
      id: input.screenshotId,
      project: {
        userId: input.userId,
      },
    },
    select: {
      id: true,
      storagePath: true,
      creatives: {
        select: {
          id: true,
          storagePath: true,
        },
      },
    },
  });

  if (!screenshot) {
    return null;
  }

  await prisma.projectScreenshot.delete({
    where: {
      id: screenshot.id,
    },
  });

  return screenshot;
}

export async function createScreenshotCreative(input: {
  projectId: string;
  screenshotId: string;
  prompt: string;
  model: string;
  headline?: string | null;
  subheadline?: string | null;
  storagePath?: string | null;
  width?: number;
  height?: number;
  creditsCharged?: number;
}) {
  return prisma.screenshotCreative.create({
    data: {
      projectId: input.projectId,
      screenshotId: input.screenshotId,
      status: "SUCCEEDED",
      prompt: input.prompt,
      model: input.model,
      headline: input.headline ?? null,
      subheadline: input.subheadline ?? null,
      storagePath: input.storagePath ?? null,
      width: input.width ?? 1284,
      height: input.height ?? 2778,
      creditsCharged: input.creditsCharged ?? 0,
    },
  });
}

export async function getLatestScreenshotCreativeByScreenshotIdForUser(input: {
  screenshotId: string;
  userId: string;
}) {
  return prisma.screenshotCreative.findFirst({
    where: {
      screenshotId: input.screenshotId,
      screenshot: {
        project: {
          userId: input.userId,
        },
      },
    },
    orderBy: [{ generatedAt: "desc" }],
  });
}

export async function listScreenshotCreativesByProjectIdForUser(input: { projectId: string; userId: string }) {
  return prisma.screenshotCreative.findMany({
    where: {
      projectId: input.projectId,
      project: {
        userId: input.userId,
      },
    },
    orderBy: [{ generatedAt: "desc" }],
  });
}

export async function createScreenshotCreativesBatchAndDebitCredits(input: {
  userId: string;
  projectId: string;
  prompt: string;
  model: string;
  creditsPerImage: number;
  items: Array<{
    screenshotId: string;
    headline: string;
    subheadline: string;
    storagePath: string;
    width: number;
    height: number;
  }>;
}) {
  const perImageCost = Math.max(0, Math.floor(input.creditsPerImage));
  const totalCost = perImageCost * input.items.length;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
      select: { id: true },
    });

    if (totalCost > 0) {
      const debitResult = await tx.userWallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: totalCost,
          },
        },
        data: {
          balance: {
            decrement: totalCost,
          },
        },
      });

      if (debitResult.count === 0) {
        const currentWallet = await tx.userWallet.findUnique({
          where: { id: wallet.id },
          select: { balance: true },
        });
        throw new InsufficientCreditsError(totalCost, currentWallet?.balance ?? 0);
      }
    }

    const walletAfter = await tx.userWallet.findUnique({
      where: { id: wallet.id },
      select: { balance: true },
    });

    const creatives = [];
    for (const item of input.items) {
      const created = await tx.screenshotCreative.create({
        data: {
          projectId: input.projectId,
          screenshotId: item.screenshotId,
          status: "SUCCEEDED",
          prompt: input.prompt,
          model: input.model,
          headline: item.headline,
          subheadline: item.subheadline,
          storagePath: item.storagePath,
          width: item.width,
          height: item.height,
          creditsCharged: perImageCost,
        },
      });
      creatives.push(created);
    }

    if (totalCost > 0) {
      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          userId: input.userId,
          type: WalletLedgerType.DEBIT_USAGE,
          amount: -totalCost,
          balanceAfter: walletAfter?.balance ?? 0,
          reference: input.projectId,
          description: `Generated ${input.items.length} screenshot creative image(s)`,
        },
      });
    }

    return {
      creatives,
      chargedCredits: totalCost,
      balanceAfter: walletAfter?.balance ?? 0,
    };
  });
}
