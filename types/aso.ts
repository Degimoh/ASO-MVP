import { GenerationType, Platform } from "@prisma/client";

export type ProjectFormValues = {
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
};

export type GenerateRequest = {
  projectId: string;
  type: GenerationType;
  targetLocale?: string;
};

export type StructuredGeneratedContent = Record<string, unknown>;

export type ParsedProject = {
  id: string;
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
  createdAt: string;
};
