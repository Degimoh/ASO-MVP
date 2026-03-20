import { GenerationType, Platform } from "@prisma/client";

export type PromptProjectContext = {
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

export type PromptBuildInput = {
  type: GenerationType;
  project: PromptProjectContext;
  targetLocale?: string;
};

export type PromptBuildOutput = {
  systemPrompt: string;
  userPrompt: string;
};
