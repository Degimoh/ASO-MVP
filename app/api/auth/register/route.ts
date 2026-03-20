import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/src/lib/auth/password";
import { createSessionForUser, setSessionCookie } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";

const registerSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: hashPassword(parsed.data.password),
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const session = await createSessionForUser(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ data: { user } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to register user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
