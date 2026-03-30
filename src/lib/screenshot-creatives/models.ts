export const NANO_BANANA_PRO_MODEL = "google/gemini-3-pro-image-preview";
export const NANO_BANANA_2_MODEL = "google/gemini-3.1-flash-image-preview";

const allowedScreenshotCreativeModels = new Set<string>([NANO_BANANA_PRO_MODEL, NANO_BANANA_2_MODEL]);

export type ScreenshotCreativeModelConfig = {
  primaryModel: string;
  fallbackModel: string;
};

function assertAllowedModel(model: string, variableName: string) {
  if (!allowedScreenshotCreativeModels.has(model)) {
    throw new Error(
      `Invalid ${variableName} value "${model}". Use "${NANO_BANANA_PRO_MODEL}" or "${NANO_BANANA_2_MODEL}".`,
    );
  }
}

function resolveDefaultFallback(primaryModel: string) {
  return primaryModel === NANO_BANANA_PRO_MODEL ? NANO_BANANA_2_MODEL : NANO_BANANA_PRO_MODEL;
}

export function resolveScreenshotCreativeModelConfig(): ScreenshotCreativeModelConfig {
  const primaryModel =
    process.env.SCREENSHOT_CREATIVE_MODEL?.trim() ||
    process.env.OPENROUTER_SCREENSHOT_CREATIVE_MODEL?.trim() ||
    NANO_BANANA_PRO_MODEL;
  assertAllowedModel(primaryModel, "SCREENSHOT_CREATIVE_MODEL");

  const configuredFallback =
    process.env.SCREENSHOT_CREATIVE_FALLBACK_MODEL?.trim() ||
    process.env.OPENROUTER_SCREENSHOT_CREATIVE_FALLBACK_MODEL?.trim();

  const fallbackModel = configuredFallback || resolveDefaultFallback(primaryModel);
  assertAllowedModel(fallbackModel, "SCREENSHOT_CREATIVE_FALLBACK_MODEL");

  return {
    primaryModel,
    fallbackModel: fallbackModel === primaryModel ? resolveDefaultFallback(primaryModel) : fallbackModel,
  };
}

export function resolveScreenshotCreativeModelCandidates(requestedModel?: string): string[] {
  const normalizedRequested = requestedModel?.trim();
  if (normalizedRequested) {
    assertAllowedModel(normalizedRequested, "requested screenshot creative model");
    return [normalizedRequested];
  }

  const { primaryModel, fallbackModel } = resolveScreenshotCreativeModelConfig();
  return fallbackModel === primaryModel ? [primaryModel] : [primaryModel, fallbackModel];
}

export function formatScreenshotCreativeModelName(model: string): string {
  if (model === NANO_BANANA_PRO_MODEL) {
    return "Nano Banana Pro";
  }

  if (model === NANO_BANANA_2_MODEL) {
    return "Nano Banana 2";
  }

  return model;
}
