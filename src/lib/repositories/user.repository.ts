import { prisma } from "@/src/lib/prisma";

const DEMO_EMAIL = "demo@aiaso.app";

export async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
    },
  });
}

export async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
}
