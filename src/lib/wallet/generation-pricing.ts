import { AssetType, GenerationType } from "@prisma/client";

export const GENERATION_CREDIT_COSTS: Record<AssetType, number> = {
  DESCRIPTION: 3,
  KEYWORDS: 1,
  SCREENSHOT_CAPTIONS: 2,
  UPDATE_NOTES: 1,
  LOCALIZATION: 2,
};

export function getAssetGenerationCreditCost(type: AssetType): number {
  return GENERATION_CREDIT_COSTS[type] ?? 1;
}

export function getLegacyGenerationCreditCost(type: GenerationType): number {
  return getAssetGenerationCreditCost(type as AssetType);
}

export const GENERATE_ALL_INCLUDED_ASSETS: AssetType[] = [
  AssetType.DESCRIPTION,
  AssetType.KEYWORDS,
  AssetType.SCREENSHOT_CAPTIONS,
  AssetType.UPDATE_NOTES,
];

export function getGenerateAllProjectedCreditCost() {
  return GENERATE_ALL_INCLUDED_ASSETS.reduce((total, type) => total + getAssetGenerationCreditCost(type), 0);
}
