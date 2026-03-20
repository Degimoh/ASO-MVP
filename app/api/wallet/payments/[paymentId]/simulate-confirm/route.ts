import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import {
  confirmCryptoPaymentAndCreditWallet,
  findCryptoPaymentByIdForUser,
} from "@/src/lib/repositories/wallet.repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { paymentId } = await params;

  try {
    const payment = await findCryptoPaymentByIdForUser(paymentId, auth.user.id);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.provider !== "MOCK") {
      return NextResponse.json({ error: "Simulate confirm is only available for mock payments" }, { status: 400 });
    }

    const confirmed = await confirmCryptoPaymentAndCreditWallet({ paymentId });
    if (!confirmed) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        paymentId: confirmed.id,
        status: confirmed.status,
        confirmedAt: confirmed.confirmedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to confirm payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
