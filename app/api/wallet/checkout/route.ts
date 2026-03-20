import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/src/lib/auth/api";
import { getOrCreateWalletForUser } from "@/src/lib/repositories/wallet.repository";
import { createCryptoCheckout } from "@/src/lib/services/crypto-checkout.service";

const payloadSchema = z.object({
  packageId: z.string().trim().min(1),
  cryptoCurrency: z.string().trim().min(2).max(12).default("USDC"),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const wallet = await getOrCreateWalletForUser(auth.user.id);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.OPENROUTER_SITE_URL ||
      new URL(request.url).origin;

    const checkout = await createCryptoCheckout({
      userId: auth.user.id,
      walletId: wallet.id,
      packageId: parsed.data.packageId,
      cryptoCurrency: parsed.data.cryptoCurrency,
      appBaseUrl: baseUrl,
    });

    return NextResponse.json({ data: checkout }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create crypto checkout",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
