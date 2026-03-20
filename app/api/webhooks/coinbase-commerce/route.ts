import { NextResponse } from "next/server";
import { CryptoPaymentStatus } from "@prisma/client";
import {
  confirmCryptoPaymentAndCreditWallet,
  findCryptoPaymentById,
  findCryptoPaymentByProviderChargeId,
  markCryptoPaymentStatus,
} from "@/src/lib/repositories/wallet.repository";
import { verifyCoinbaseWebhookSignature } from "@/src/lib/services/crypto-checkout.service";

type CoinbaseEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    metadata?: {
      internalPaymentId?: string;
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-CC-Webhook-Signature");

  if (!verifyCoinbaseWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as CoinbaseEvent;
    const chargeId = event.data?.id;
    const internalPaymentId = event.data?.metadata?.internalPaymentId;

    let payment = chargeId ? await findCryptoPaymentByProviderChargeId(chargeId) : null;
    if (!payment && internalPaymentId) {
      payment = await findCryptoPaymentById(internalPaymentId);
    }

    if (!payment) {
      return NextResponse.json({ data: { acknowledged: true } });
    }

    const eventType = event.type || "";
    const paymentId = payment.id;

    if (eventType === "charge:confirmed") {
      await confirmCryptoPaymentAndCreditWallet({
        paymentId,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    if (eventType === "charge:failed") {
      await markCryptoPaymentStatus({
        paymentId,
        status: CryptoPaymentStatus.FAILED,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    if (eventType === "charge:canceled") {
      await markCryptoPaymentStatus({
        paymentId,
        status: CryptoPaymentStatus.CANCELED,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    if (eventType === "charge:delayed") {
      await markCryptoPaymentStatus({
        paymentId,
        status: CryptoPaymentStatus.PENDING,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    if (eventType === "charge:pending") {
      await markCryptoPaymentStatus({
        paymentId,
        status: CryptoPaymentStatus.REQUIRES_ACTION,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    if (eventType === "charge:resolved") {
      await confirmCryptoPaymentAndCreditWallet({
        paymentId,
        providerChargeId: chargeId,
      });
      return NextResponse.json({ data: { acknowledged: true } });
    }

    return NextResponse.json({ data: { acknowledged: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
