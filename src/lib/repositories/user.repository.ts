import { prisma } from "@/src/lib/prisma";
import { hashPassword } from "@/src/lib/auth/password";

const DEMO_EMAIL = "demo@aiaso.app";

export async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash: hashPassword("demo-password") },
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash: hashPassword("demo-password"),
    },
  });
}

export async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
}
