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
        url: "postgresql://postgres.aaxjwagrwhfcasxkycsw:UNESI_SIFRU@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1",
      },
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}