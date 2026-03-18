import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL?.includes("db.")
  ? process.env.DATABASE_URL.replace(
      /db\.[^@]+\.supabase\.com/,
      "aws-1-eu-west-1.pooler.supabase.com"
    ).replace(":5432", ":6543") + "?pgbouncer=true&connection_limit=1"
  : process.env.DATABASE_URL

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}