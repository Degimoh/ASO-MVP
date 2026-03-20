import { NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export async function requireApiUser() {
  const user = await getCurrentUserFromSession();

  if (!user) {
    return {
      user: null,
      unauthorizedResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  return {
    user,
    unauthorizedResponse: null,
  } as const;
}
