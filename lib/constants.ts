export const PLATFORM_OPTIONS = ["IOS", "ANDROID", "CROSS_PLATFORM"] as const;
export type PlatformOption = (typeof PLATFORM_OPTIONS)[number];

export const GENERATION_TYPE_OPTIONS = [
  "DESCRIPTION",
  "KEYWORDS",
  "SCREENSHOT_CAPTIONS",
  "UPDATE_NOTES",
  "LOCALIZATION",
] as const;

export type GenerationTypeOption = (typeof GENERATION_TYPE_OPTIONS)[number];
