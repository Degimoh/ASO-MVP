import { AssetType, GenerationStatus, Platform, ProjectStatus, WalletLedgerType } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/prisma";

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@aiaso.app" },
    update: { name: "Demo User", passwordHash: hashPassword("demo-password") },
    create: {
      email: "demo@aiaso.app",
      name: "Demo User",
      passwordHash: hashPassword("demo-password"),
    },
  });

  await prisma.project.deleteMany({ where: { userId: demoUser.id } });
  await prisma.userWallet.deleteMany({ where: { userId: demoUser.id } });

  const project = await prisma.project.create({
    data: {
      userId: demoUser.id,
      appName: "Habit Flow",
      platform: Platform.IOS,
      category: "Productivity",
      status: ProjectStatus.ACTIVE,
      appSummary: "Habit Flow helps users build routines with personalized nudges and streak analytics.",
      targetAudience: "Busy professionals and students who want to stay consistent with daily habits.",
      toneOfVoice: "Motivational and clear",
      primaryLanguage: "en-US",
      competitors: ["Habitica", "Streaks"],
      importantKeywords: ["habit tracker", "daily routine", "streak app"],
      features: {
        create: [
          { value: "AI-powered habit recommendations", sortOrder: 0 },
          { value: "Daily streak milestones", sortOrder: 1 },
          { value: "Progress insights dashboard", sortOrder: 2 },
        ],
      },
      locales: {
        create: [{ code: "en-US" }, { code: "es-ES" }],
      },
      generationResults: {
        create: [
          {
            type: AssetType.DESCRIPTION,
            status: GenerationStatus.SUCCEEDED,
            version: 1,
            locale: "en-US",
            prompt: "Generate App Store description for Habit Flow",
            model: "openai/gpt-4o-mini",
            content: {
              headline: "Build better habits every day",
              shortDescription: "AI guidance to stay consistent.",
              fullDescription:
                "Habit Flow turns your goals into easy daily actions with smart nudges and motivating streaks.",
            },
          },
        ],
      },
    },
  });

  await prisma.usageLog.create({
    data: {
      userId: demoUser.id,
      projectId: project.id,
      action: "seed_generation",
      status: "success",
      model: "openai/gpt-4o-mini",
      latencyMs: 420,
    },
  });

  const wallet = await prisma.userWallet.create({
    data: {
      userId: demoUser.id,
      balance: 200,
    },
  });

  await prisma.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      userId: demoUser.id,
      type: WalletLedgerType.CREDIT_ADJUSTMENT,
      amount: 200,
      balanceAfter: 200,
      description: "Seed credits for demo account",
    },
  });

  console.log("Seed completed: demo user and demo project created.");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
