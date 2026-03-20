import { Platform, Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

const projectWithRelations = {
  features: { orderBy: { sortOrder: "asc" as const } },
  locales: { orderBy: { code: "asc" as const } },
} satisfies Prisma.ProjectInclude;
const projectWorkspaceInclude = {
  ...projectWithRelations,
  generationResults: {
    orderBy: [{ generatedAt: "desc" as const }, { version: "desc" as const }],
  },
} satisfies Prisma.ProjectInclude;

export type ProjectRecord = Prisma.ProjectGetPayload<{
  include: typeof projectWithRelations;
}>;
export type ProjectWorkspaceRecord = Prisma.ProjectGetPayload<{
  include: typeof projectWorkspaceInclude;
}>;

export type ProjectCardRecord = Prisma.ProjectGetPayload<{
  select: {
    id: true;
    appName: true;
    platform: true;
    category: true;
    primaryLanguage: true;
    updatedAt: true;
  };
}>;

export type CreateProjectInput = {
  userId: string;
  appName: string;
  platform: Platform;
  category: string;
  appSummary: string;
  coreFeatures: string[];
  targetAudience: string;
  toneOfVoice: string;
  primaryLanguage: string;
  targetLocales: string[];
  competitors: string[];
  importantKeywords: string[];
  status?: ProjectStatus;
};

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  return prisma.project.create({
    data: {
      userId: input.userId,
      appName: input.appName,
      platform: input.platform,
      category: input.category,
      appSummary: input.appSummary,
      targetAudience: input.targetAudience,
      toneOfVoice: input.toneOfVoice,
      primaryLanguage: input.primaryLanguage,
      competitors: input.competitors,
      importantKeywords: input.importantKeywords,
      status: input.status ?? ProjectStatus.DRAFT,
      features: {
        create: input.coreFeatures.map((value, index) => ({
          value,
          sortOrder: index,
        })),
      },
      locales: {
        create: input.targetLocales.map((code) => ({ code })),
      },
    },
    include: projectWithRelations,
  });
}

export async function getProjectById(projectId: string): Promise<ProjectRecord | null> {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: projectWithRelations,
  });
}

export async function getProjectByIdForUser(projectId: string, userId: string): Promise<ProjectRecord | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: projectWithRelations,
  });
}

export async function getProjectWorkspaceById(projectId: string): Promise<ProjectWorkspaceRecord | null> {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: projectWorkspaceInclude,
  });
}

export async function getProjectWorkspaceByIdForUser(
  projectId: string,
  userId: string,
): Promise<ProjectWorkspaceRecord | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: projectWorkspaceInclude,
  });
}

export async function listProjectsByUserId(userId: string): Promise<ProjectRecord[]> {
  return prisma.project.findMany({
    where: { userId },
    include: projectWithRelations,
    orderBy: { updatedAt: "desc" },
  });
}

export async function listProjectCardsByUserId(userId: string): Promise<ProjectCardRecord[]> {
  return prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      appName: true,
      platform: true,
      category: true,
      primaryLanguage: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
