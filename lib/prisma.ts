import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

console.log("DATABASE_URL:", process.env.DATABASE_URL)
console.log("DIRECT_URL:", process.env.DIRECT_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "query"],
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_s5w2VvETlnmX@ep-wispy-dawn-alnxam1d-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
      },
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}