import { GenerationType, Platform } from "@prisma/client";
import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "Required");

export const projectPayloadSchema = z.object({
  appName: nonEmptyString,
  platform: z.nativeEnum(Platform),
  category: nonEmptyString,
  appSummary: nonEmptyString,
  coreFeatures: z.array(nonEmptyString).min(1, "Add at least one core feature"),
  targetAudience: nonEmptyString,
  toneOfVoice: nonEmptyString,
  primaryLanguage: nonEmptyString,
  targetLocales: z.array(nonEmptyString).min(1, "Add at least one target locale"),
  competitors: z.array(nonEmptyString).default([]),
  importantKeywords: z.array(nonEmptyString).default([]),
});

export const generatePayloadSchema = z.object({
  projectId: nonEmptyString,
  type: z.nativeEnum(GenerationType),
  targetLocale: z.string().trim().optional(),
});

export const updateGenerationSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});
