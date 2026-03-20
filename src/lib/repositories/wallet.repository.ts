import { CryptoPaymentStatus, Prisma, WalletLedgerType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { InsufficientCreditsError } from "@/src/lib/wallet/errors";

export async function getOrCreateWalletForUser(userId: string) {
  return prisma.userWallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getWalletSnapshotForUser(userId: string) {
  const wallet = await getOrCreateWalletForUser(userId);

  const [ledgerEntries, payments] = await Promise.all([
    prisma.walletLedgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.cryptoPayment.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { wallet, ledgerEntries, payments };
}

export async function createCryptoPaymentRecord(input: {
  userId: string;
  walletId: string;
  provider: string;
  cryptoCurrency: string;
  usdAmountCents: number;
  creditsToGrant: number;
  status?: CryptoPaymentStatus;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.cryptoPayment.create({
    data: {
      userId: input.userId,
      walletId: input.walletId,
      provider: input.provider,
      cryptoCurrency: input.cryptoCurrency,
      usdAmountCents: input.usdAmountCents,
      creditsToGrant: input.creditsToGrant,
      status: input.status ?? CryptoPaymentStatus.PENDING,
      metadata: input.metadata,
    },
  });
}

export async function updateCryptoPaymentCheckout(input: {
  paymentId: string;
  status: CryptoPaymentStatus;
  providerChargeId?: string | null;
  checkoutUrl?: string | null;
  paymentAddress?: string | null;
  cryptoAmount?: string | null;
  expiresAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.cryptoPayment.update({
    where: { id: input.paymentId },
    data: {
      status: input.status,
      providerChargeId: input.providerChargeId ?? undefined,
      checkoutUrl: input.checkoutUrl ?? undefined,
      paymentAddress: input.paymentAddress ?? undefined,
      cryptoAmount: input.cryptoAmount ?? undefined,
      expiresAt: input.expiresAt ?? undefined,
      metadata: input.metadata,
    },
  });
}

export async function markCryptoPaymentStatus(input: {
  paymentId: string;
  status: CryptoPaymentStatus;
  providerChargeId?: string | null;
}) {
  return prisma.cryptoPayment.update({
    where: { id: input.paymentId },
    data: {
      status: input.status,
      providerChargeId: input.providerChargeId ?? undefined,
    },
  });
}

export async function findCryptoPaymentByIdForUser(paymentId: string, userId: string) {
  return prisma.cryptoPayment.findFirst({
    where: {
      id: paymentId,
      userId,
    },
  });
}

export async function findCryptoPaymentByProviderChargeId(providerChargeId: string) {
  return prisma.cryptoPayment.findFirst({
    where: { providerChargeId },
  });
}

export async function findCryptoPaymentById(paymentId: string) {
  return prisma.cryptoPayment.findUnique({
    where: { id: paymentId },
  });
}

export async function debitCreditsForUser(input: {
  userId: string;
  amount: number;
  description: string;
  reference?: string;
}) {
  const amount = Math.max(0, Math.floor(input.amount));
  if (amount === 0) {
    const wallet = await getOrCreateWalletForUser(input.userId);
    return { balanceAfter: wallet.balance, chargedCredits: 0 };
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.userWallet.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
      select: { id: true },
    });

    const debitResult = await tx.userWallet.updateMany({
      where: {
        id: wallet.id,
        balance: {
          gte: amount,
        },
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    if (debitResult.count === 0) {
      const currentWallet = await tx.userWallet.findUnique({
        where: { id: wallet.id },
        select: { balance: true },
      });
      throw new InsufficientCreditsError(amount, currentWallet?.balance ?? 0);
    }

    const walletAfter = await tx.userWallet.findUnique({
      where: { id: wallet.id },
      select: { balance: true },
    });

    await tx.walletLedgerEntry.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: WalletLedgerType.DEBIT_USAGE,
        amount: -amount,
        balanceAfter: walletAfter?.balance ?? 0,
        reference: input.reference,
        description: input.description,
      },
    });

    return {
      balanceAfter: walletAfter?.balance ?? 0,
      chargedCredits: amount,
    };
  });
}

export async function confirmCryptoPaymentAndCreditWallet(input: {
  paymentId: string;
  providerChargeId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.cryptoPayment.findUnique({
      where: { id: input.paymentId },
      select: {
        id: true,
        userId: true,
        walletId: true,
        status: true,
        creditsToGrant: true,
        ledgerEntryId: true,
      },
    });

    if (!payment) {
      return null;
    }

    if (payment.status === CryptoPaymentStatus.CONFIRMED && payment.ledgerEntryId) {
      return tx.cryptoPayment.findUnique({
        where: { id: payment.id },
      });
    }

    const wallet = await tx.userWallet.update({
      where: { id: payment.walletId },
      data: {
        balance: { increment: payment.creditsToGrant },
      },
      select: {
        balance: true,
      },
    });

    const ledgerEntry = await tx.walletLedgerEntry.create({
      data: {
        walletId: payment.walletId,
        userId: payment.userId,
        type: WalletLedgerType.CREDIT_PURCHASE,
        amount: payment.creditsToGrant,
        balanceAfter: wallet.balance,
        reference: payment.id,
        description: `Crypto purchase credited (${payment.creditsToGrant} credits)`,
      },
    });

    return tx.cryptoPayment.update({
      where: { id: payment.id },
      data: {
        status: CryptoPaymentStatus.CONFIRMED,
        providerChargeId: input.providerChargeId ?? undefined,
        confirmedAt: new Date(),
        ledgerEntryId: ledgerEntry.id,
      },
    });
  });
}
