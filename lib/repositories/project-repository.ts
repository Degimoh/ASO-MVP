import { Platform, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ProjectFormValues } from "@/types/aso";

const projectInclude = {
  features: { orderBy: { sortOrder: "asc" as const } },
  locales: true,
  generationResults: { orderBy: { generatedAt: "desc" as const } },
} satisfies Prisma.ProjectInclude;
type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@aiaso.app" },
    update: {},
    create: {
      email: "demo@aiaso.app",
      name: "Demo User",
    },
  });
}

export async function createProject(userId: string, payload: ProjectFormValues) {
  return prisma.project.create({
    data: {
      userId,
      appName: payload.appName,
      platform: payload.platform,
      category: payload.category,
      appSummary: payload.appSummary,
      targetAudience: payload.targetAudience,
      toneOfVoice: payload.toneOfVoice,
      primaryLanguage: payload.primaryLanguage,
      competitors: payload.competitors,
      importantKeywords: payload.importantKeywords,
      features: {
        create: payload.coreFeatures.map((value, index) => ({
          value,
          sortOrder: index,
        })),
      },
      locales: {
        create: payload.targetLocales.map((code) => ({ code })),
      },
    },
    include: projectInclude,
  });
}

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });
}

export function mapProjectResponse(project: ProjectWithRelations) {
  return {
    id: project.id,
    appName: project.appName,
    platform: project.platform as Platform,
    category: project.category,
    appSummary: project.appSummary,
    coreFeatures: project.features.map((feature) => feature.value),
    targetAudience: project.targetAudience,
    toneOfVoice: project.toneOfVoice,
    primaryLanguage: project.primaryLanguage,
    targetLocales: project.locales.map((locale) => locale.code),
    competitors: project.competitors,
    importantKeywords: project.importantKeywords,
    generationResults: project.generationResults,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
