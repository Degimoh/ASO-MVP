"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WalletPackage = {
  id: string;
  label: string;
  credits: number;
  usdAmountCents: number;
};

type WalletLedgerEntry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string | null;
  createdAt: string;
};

type CryptoPayment = {
  id: string;
  provider: string;
  status: string;
  cryptoCurrency: string;
  usdAmountCents: number;
  creditsToGrant: number;
  checkoutUrl: string | null;
  paymentAddress: string | null;
  cryptoAmount: string | null;
  createdAt: string;
  confirmedAt: string | null;
  expiresAt: string | null;
};

type WalletResponse = {
  wallet: {
    id: string;
    balance: number;
    updatedAt: string;
  };
  packages: WalletPackage[];
  generationPricing: {
    perAsset: Record<string, number>;
    generateAllProjected: number;
  };
  ledgerEntries: WalletLedgerEntry[];
  payments: CryptoPayment[];
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function mapStatusTone(status: string) {
  if (status === "CONFIRMED") return "text-green-700";
  if (status === "FAILED" || status === "CANCELED" || status === "EXPIRED") return "text-red-700";
  return "text-amber-700";
}

export function CreditsWalletCard() {
  const [snapshot, setSnapshot] = useState<WalletResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWallet() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        const body = (await response.json()) as { error?: string; data?: WalletResponse };

        if (!response.ok || !body.data) {
          throw new Error(body.error || "Failed to load wallet");
        }

        if (mounted) {
          setSnapshot(body.data);
        }
      } catch (error) {
        if (mounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load wallet");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadWallet();

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshWallet() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      const body = (await response.json()) as { error?: string; data?: WalletResponse };

      if (!response.ok || !body.data) {
        throw new Error(body.error || "Failed to load wallet");
      }

      setSnapshot(body.data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  }

  async function createCheckout(packageId: string) {
    setCheckoutError(null);
    setPendingPackageId(packageId);

    try {
      const response = await fetch("/api/wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          cryptoCurrency: "USDC",
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        data?: { checkoutUrl?: string | null; isMock?: boolean };
      };

      if (!response.ok || !body.data) {
        throw new Error(body.error || "Failed to create checkout");
      }

      await refreshWallet();

      if (body.data.checkoutUrl) {
        window.open(body.data.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Failed to create checkout");
    } finally {
      setPendingPackageId(null);
    }
  }

  async function simulateConfirm(paymentId: string) {
    setCheckoutError(null);
    setConfirmingPaymentId(paymentId);

    try {
      const response = await fetch(`/api/wallet/payments/${paymentId}/simulate-confirm`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Failed to confirm payment");
      }

      await refreshWallet();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Failed to confirm payment");
    } finally {
      setConfirmingPaymentId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits & Crypto Payments</CardTitle>
        <CardDescription>
          Buy internal credits with crypto. Confirmed payments automatically credit your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded bg-slate-100" />
          </div>
        ) : null}

        {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

        {snapshot && !isLoading ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current balance</p>
              <p className="text-2xl font-semibold text-slate-900">{snapshot.wallet.balance} credits</p>
              <p className="text-xs text-slate-500">Updated {formatDate(snapshot.wallet.updatedAt)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Generation credit costs</p>
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                <ul className="space-y-1">
                  {Object.entries(snapshot.generationPricing.perAsset).map(([asset, cost]) => (
                    <li key={asset} className="flex items-center justify-between gap-2">
                      <span>{asset.replaceAll("_", " ").toLowerCase()}</span>
                      <Badge variant="outline">{cost} credits</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
                  Generate All projected total: {snapshot.generationPricing.generateAllProjected} credits
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Buy credit packages</p>
              <div className="grid gap-2 md:grid-cols-3">
                {snapshot.packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-md border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{pkg.label}</p>
                    <p className="text-sm text-slate-600">
                      {pkg.credits} credits · {formatUsd(pkg.usdAmountCents)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => createCheckout(pkg.id)}
                      disabled={pendingPackageId !== null || confirmingPaymentId !== null}
                    >
                      {pendingPackageId === pkg.id ? "Creating..." : "Buy with crypto"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {checkoutError ? <p className="text-sm text-red-600">{checkoutError}</p> : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Recent crypto payments</p>
              {snapshot.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payment attempts yet.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">
                          {payment.creditsToGrant} credits · {formatUsd(payment.usdAmountCents)}
                        </p>
                        <span className={mapStatusTone(payment.status)}>{payment.status}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Provider: {payment.provider} · Currency: {payment.cryptoCurrency} · Created{" "}
                        {formatDate(payment.createdAt)}
                      </p>
                      {payment.paymentAddress ? (
                        <p className="mt-1 truncate text-xs text-slate-500">Address: {payment.paymentAddress}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {payment.checkoutUrl ? (
                          <Button type="button" variant="outline" size="sm" asChild>
                            <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">
                              Open checkout
                            </a>
                          </Button>
                        ) : null}
                        {payment.provider === "MOCK" && payment.status !== "CONFIRMED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => simulateConfirm(payment.id)}
                            disabled={confirmingPaymentId !== null || pendingPackageId !== null}
                          >
                            {confirmingPaymentId === payment.id ? "Confirming..." : "Simulate confirm"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Ledger</p>
              {snapshot.ledgerEntries.length === 0 ? (
                <p className="text-sm text-slate-500">No ledger entries yet.</p>
              ) : (
                <div className="space-y-1">
                  {snapshot.ledgerEntries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.description}</p>
                        <p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={entry.amount >= 0 ? "secondary" : "outline"}>
                          {entry.amount >= 0 ? `+${entry.amount}` : entry.amount} credits
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">Balance: {entry.balanceAfter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
