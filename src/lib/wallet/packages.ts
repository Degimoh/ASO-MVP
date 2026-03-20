export type CreditPackage = {
  id: string;
  label: string;
  credits: number;
  usdAmountCents: number;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", label: "Starter", credits: 250, usdAmountCents: 500 },
  { id: "growth", label: "Growth", credits: 800, usdAmountCents: 1200 },
  { id: "scale", label: "Scale", credits: 2000, usdAmountCents: 2500 },
];

export function getCreditPackageById(packageId: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId) ?? null;
}

export function formatUsd(cents: number) {
  return (cents / 100).toFixed(2);
}
