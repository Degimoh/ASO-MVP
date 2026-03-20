import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaClientSingleton: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = global.prismaClientSingleton ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaClientSingleton = prisma;
}
