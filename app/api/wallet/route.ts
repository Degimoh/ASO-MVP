import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { getWalletSnapshotForUser } from "@/src/lib/repositories/wallet.repository";
import { CREDIT_PACKAGES } from "@/src/lib/wallet/packages";
import { GENERATION_CREDIT_COSTS, getGenerateAllProjectedCreditCost } from "@/src/lib/wallet/generation-pricing";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  try {
    const snapshot = await getWalletSnapshotForUser(auth.user.id);

    return NextResponse.json({
      data: {
        wallet: {
          id: snapshot.wallet.id,
          balance: snapshot.wallet.balance,
          updatedAt: snapshot.wallet.updatedAt,
        },
        packages: CREDIT_PACKAGES,
        generationPricing: {
          perAsset: GENERATION_CREDIT_COSTS,
          generateAllProjected: getGenerateAllProjectedCreditCost(),
        },
        ledgerEntries: snapshot.ledgerEntries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          description: entry.description,
          reference: entry.reference,
          createdAt: entry.createdAt,
        })),
        payments: snapshot.payments.map((payment) => ({
          id: payment.id,
          provider: payment.provider,
          status: payment.status,
          cryptoCurrency: payment.cryptoCurrency,
          usdAmountCents: payment.usdAmountCents,
          creditsToGrant: payment.creditsToGrant,
          checkoutUrl: payment.checkoutUrl,
          paymentAddress: payment.paymentAddress,
          cryptoAmount: payment.cryptoAmount,
          createdAt: payment.createdAt,
          confirmedAt: payment.confirmedAt,
          expiresAt: payment.expiresAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load wallet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
