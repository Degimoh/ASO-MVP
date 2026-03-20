import { createHmac, randomBytes } from "crypto";
import { CryptoPaymentStatus, Prisma } from "@prisma/client";
import {
  createCryptoPaymentRecord,
  updateCryptoPaymentCheckout,
} from "@/src/lib/repositories/wallet.repository";
import { formatUsd, getCreditPackageById } from "@/src/lib/wallet/packages";

type CreateCryptoCheckoutInput = {
  userId: string;
  walletId: string;
  packageId: string;
  cryptoCurrency: string;
  appBaseUrl: string;
};

export class CryptoCheckoutError extends Error {}

function parseProvider() {
  const explicit = process.env.CRYPTO_PROVIDER?.trim().toLowerCase();
  if (explicit === "coinbase") return "coinbase" as const;
  if (explicit === "mock") return "mock" as const;

  return process.env.COINBASE_COMMERCE_API_KEY ? ("coinbase" as const) : ("mock" as const);
}

async function createCoinbaseCheckout(input: {
  paymentId: string;
  packageLabel: string;
  usdAmountCents: number;
  appBaseUrl: string;
  metadata: Prisma.InputJsonValue;
}) {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    throw new CryptoCheckoutError("Coinbase Commerce API key is missing");
  }

  const response = await fetch("https://api.commerce.coinbase.com/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CC-Api-Key": apiKey,
      "X-CC-Version": "2018-03-22",
    },
    body: JSON.stringify({
      name: `AI ASO Credits - ${input.packageLabel}`,
      description: `Purchase credits for AI ASO Generator (Payment ${input.paymentId})`,
      local_price: {
        amount: formatUsd(input.usdAmountCents),
        currency: "USD",
      },
      pricing_type: "fixed_price",
      metadata: input.metadata,
      redirect_url: `${input.appBaseUrl}/dashboard/settings?payment=${input.paymentId}`,
      cancel_url: `${input.appBaseUrl}/dashboard/settings?paymentCanceled=${input.paymentId}`,
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    data?: {
      id?: string;
      hosted_url?: string;
      expires_at?: string;
      addresses?: Record<string, string>;
      pricing?: {
        [key: string]: {
          amount?: string;
          currency?: string;
        };
      };
    };
  };

  if (!response.ok || !payload.data?.id || !payload.data?.hosted_url) {
    throw new CryptoCheckoutError(payload.error?.message || "Failed to create Coinbase checkout");
  }

  return {
    providerChargeId: payload.data.id,
    checkoutUrl: payload.data.hosted_url,
    paymentAddress: payload.data.addresses?.USDC || payload.data.addresses?.USDT || payload.data.addresses?.BTC,
    cryptoAmount:
      payload.data.pricing?.USDC?.amount ||
      payload.data.pricing?.USDT?.amount ||
      payload.data.pricing?.BTC?.amount ||
      null,
    expiresAt: payload.data.expires_at ? new Date(payload.data.expires_at) : null,
    metadata: payload.data as Prisma.InputJsonValue,
  };
}

function createMockCheckout(input: { paymentId: string; appBaseUrl: string }) {
  return {
    providerChargeId: `mock_${input.paymentId}`,
    checkoutUrl: `${input.appBaseUrl}/dashboard/settings?mockPayment=${input.paymentId}`,
    paymentAddress: `mock_${randomBytes(12).toString("hex")}`,
    cryptoAmount: null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: { provider: "mock" } as Prisma.InputJsonValue,
  };
}

export async function createCryptoCheckout(input: CreateCryptoCheckoutInput) {
  const pkg = getCreditPackageById(input.packageId);
  if (!pkg) {
    throw new CryptoCheckoutError("Unknown credit package");
  }

  const provider = parseProvider();
  const payment = await createCryptoPaymentRecord({
    userId: input.userId,
    walletId: input.walletId,
    provider: provider.toUpperCase(),
    cryptoCurrency: input.cryptoCurrency.toUpperCase(),
    usdAmountCents: pkg.usdAmountCents,
    creditsToGrant: pkg.credits,
    status: CryptoPaymentStatus.PENDING,
    metadata: {
      packageId: pkg.id,
      packageLabel: pkg.label,
    },
  });

  const providerMetadata = {
    internalPaymentId: payment.id,
    userId: input.userId,
    packageId: pkg.id,
    credits: pkg.credits,
  };

  const checkout =
    provider === "coinbase"
      ? await createCoinbaseCheckout({
          paymentId: payment.id,
          packageLabel: pkg.label,
          usdAmountCents: pkg.usdAmountCents,
          appBaseUrl: input.appBaseUrl,
          metadata: providerMetadata as Prisma.InputJsonValue,
        })
      : createMockCheckout({ paymentId: payment.id, appBaseUrl: input.appBaseUrl });

  const updatedPayment = await updateCryptoPaymentCheckout({
    paymentId: payment.id,
    status: CryptoPaymentStatus.REQUIRES_ACTION,
    providerChargeId: checkout.providerChargeId,
    checkoutUrl: checkout.checkoutUrl,
    paymentAddress: checkout.paymentAddress,
    cryptoAmount: checkout.cryptoAmount,
    expiresAt: checkout.expiresAt,
    metadata: checkout.metadata,
  });

  return {
    paymentId: updatedPayment.id,
    packageId: pkg.id,
    packageLabel: pkg.label,
    credits: pkg.credits,
    usdAmountCents: pkg.usdAmountCents,
    checkoutUrl: updatedPayment.checkoutUrl,
    paymentAddress: updatedPayment.paymentAddress,
    cryptoAmount: updatedPayment.cryptoAmount,
    provider: updatedPayment.provider,
    status: updatedPayment.status,
    isMock: provider === "mock",
  };
}

export function verifyCoinbaseWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signatureHeader === digest;
}
