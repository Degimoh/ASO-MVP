import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUserFromSession();

    if (!user) {
      return NextResponse.json({ data: { user: null } }, { status: 200 });
    }

    return NextResponse.json({ data: { user } });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
