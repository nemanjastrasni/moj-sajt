import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ACTIVE_WINDOW_MS = 2 * 60 * 1000

async function ensurePresenceTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS online_presence (
      visitor_id TEXT PRIMARY KEY,
      user_id TEXT,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS online_presence_last_seen_idx
    ON online_presence (last_seen)
  `
}

async function cleanupOldPresence() {
  const staleSince = new Date(Date.now() - 10 * 60 * 1000)

  await prisma.$executeRaw`
    DELETE FROM online_presence
    WHERE last_seen < ${staleSince}
  `
}

async function getOnlineCounts() {
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS)
  const rows = await prisma.$queryRaw<
    Array<{ total: number; logged_in: number }>
  >`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT user_id)::int AS logged_in
    FROM online_presence
    WHERE last_seen >= ${activeSince}
  `

  return {
    total: rows[0]?.total ?? 0,
    loggedIn: rows[0]?.logged_in ?? 0,
  }
}

export async function GET() {
  try {
    await ensurePresenceTable()
    await cleanupOldPresence()

    return NextResponse.json(await getOnlineCounts(), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ total: 0, loggedIn: 0 })
  }
}

export async function POST(req: Request) {
  try {
    await ensurePresenceTable()

    const session = await getServerSession(authOptions)
    const cookieHeader = req.headers.get("cookie") ?? ""
    const visitorMatch = cookieHeader.match(/(?:^|;\s*)ga_visitor=([^;]+)/)
    const visitorId = visitorMatch?.[1] ?? crypto.randomUUID()
    const userId = session?.user?.id ?? null

    await prisma.$executeRaw`
      INSERT INTO online_presence (visitor_id, user_id, last_seen)
      VALUES (${visitorId}, ${userId}, NOW())
      ON CONFLICT (visitor_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        last_seen = NOW()
    `

    await cleanupOldPresence()

    const res = NextResponse.json(await getOnlineCounts(), {
      headers: { "Cache-Control": "no-store" },
    })

    res.cookies.set("ga_visitor", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    return res
  } catch {
    return NextResponse.json({ total: 0, loggedIn: 0 })
  }
}
