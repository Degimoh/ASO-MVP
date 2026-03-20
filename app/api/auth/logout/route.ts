import { NextResponse } from "next/server";
import { clearSessionCookie, invalidateCurrentSession } from "@/src/lib/auth/session";

export async function POST() {
  try {
    await invalidateCurrentSession();
    await clearSessionCookie();
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to sign out",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
