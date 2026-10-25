import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { ACTIVE_WINDOW_MS, RETENTION_MS, countryCode, presenceSnapshot, type PresenceCounts, type PresenceRow } from "./model"

let ready: Promise<void> | null = null
export async function ensurePresenceTable() {
  if (!ready) ready = (async () => {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.online_presence (visitor_id TEXT PRIMARY KEY, user_id TEXT, last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(), country_code TEXT)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS online_presence_last_seen_idx ON public.online_presence (last_seen)`
  })().catch(error => { ready = null; throw error })
  await ready
}
export function visitorId(cookie: string | undefined) {
  return cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cookie) ? cookie : randomUUID()
}
export function visitsSince(since: Date) {
  return Prisma.sql`SELECT p.visitor_id, CASE WHEN u.id IS NOT NULL AND NOT u.banned THEN p.user_id ELSE NULL END AS user_id, p.last_seen, p.country_code
    FROM public.online_presence p LEFT JOIN public."User" u ON u.id = p.user_id WHERE p.last_seen >= ${since}`
}
export async function getPresenceCounts(): Promise<PresenceCounts> {
  await ensurePresenceTable()
  await cleanupPresence()
  const now = Date.now()
  const rows = await prisma.$queryRaw<{ logged_in: number; guests: number }[]>(Prisma.sql`
    WITH visits AS (${visitsSince(new Date(now - ACTIVE_WINDOW_MS))})
    SELECT COUNT(DISTINCT user_id)::int AS logged_in, (COUNT(*) FILTER (WHERE user_id IS NULL))::int AS guests FROM visits`)
  const loggedIn = rows[0]?.logged_in ?? 0, guests = rows[0]?.guests ?? 0
  return { total: loggedIn + guests, loggedIn, guests, checkedAt: new Date(now).toISOString() }
}
export async function recordPresence(id: string, userId: string | null, country: unknown) {
  await ensurePresenceTable()
  const code = countryCode(country)
  await prisma.$executeRaw`INSERT INTO public.online_presence (visitor_id, user_id, last_seen, country_code) VALUES (${id}, ${userId}, NOW(), ${code})
    ON CONFLICT (visitor_id) DO UPDATE SET user_id = EXCLUDED.user_id, last_seen = NOW(), country_code = EXCLUDED.country_code`
}
async function cleanupPresence() {
  await prisma.$executeRaw`DELETE FROM public.online_presence WHERE last_seen < ${new Date(Date.now() - RETENTION_MS)}`
}
export async function getAdminPresence() {
  await requireSongAdmin()
  await ensurePresenceTable()
  await cleanupPresence()
  const now = Date.now()
  const rows = await prisma.$queryRaw<PresenceRow[]>(visitsSince(new Date(now - RETENTION_MS)))
  const snapshot = presenceSnapshot(rows, now)
  // Cookie values are not exposed even to the admin browser; only short-lived row keys are needed.
  snapshot.visitors = snapshot.visitors.map(visitor => ({ ...visitor, id: createHash("sha256").update(visitor.id).digest("hex").slice(0, 20) }))
  return snapshot
}
