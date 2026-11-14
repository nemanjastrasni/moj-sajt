import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { ACTIVE_WINDOW_MS, RETENTION_MS, PRESENCE_CLEANUP_INTERVAL_MS, countryCode, presenceSnapshot, type PresenceCounts, type PresenceRow } from "./model"

// Provisioning is handled by the existing presence:setup command, not HTTP requests.
export function visitorId(cookie: string | undefined) {
  return cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cookie) ? cookie : randomUUID()
}
export function visitsSince(since: Date) {
  return Prisma.sql`SELECT p.visitor_id, CASE WHEN u.id IS NOT NULL AND NOT u.banned THEN p.user_id ELSE NULL END AS user_id, p.last_seen, p.country_code
    FROM public.online_presence p LEFT JOIN public."User" u ON u.id = p.user_id WHERE p.last_seen >= ${since}`
}
export async function getPresenceCounts(): Promise<PresenceCounts> {
  await cleanupPresence()
  const now = Date.now()
  const rows = await prisma.$queryRaw<{ logged_in: number; guests: number }[]>(Prisma.sql`
    WITH visits AS (${visitsSince(new Date(now - ACTIVE_WINDOW_MS))})
    SELECT COUNT(DISTINCT user_id)::int AS logged_in, (COUNT(*) FILTER (WHERE user_id IS NULL))::int AS guests FROM visits`)
  const loggedIn = rows[0]?.logged_in ?? 0, guests = rows[0]?.guests ?? 0
  return { total: loggedIn + guests, loggedIn, guests, checkedAt: new Date(now).toISOString() }
}
export async function recordPresence(id: string, userId: string | null, country: unknown) {
  const code = countryCode(country)
  await prisma.$executeRaw`INSERT INTO public.online_presence (visitor_id, user_id, last_seen, country_code) VALUES (${id}, ${userId}, NOW(), ${code})
    ON CONFLICT (visitor_id) DO UPDATE SET user_id = EXCLUDED.user_id, last_seen = NOW(), country_code = EXCLUDED.country_code`
}
let cleanupAfter = 0
let cleaning: Promise<void> | null = null
async function cleanupPresence() {
  if (cleaning) return cleaning
  if (Date.now() < cleanupAfter) return
  const pending = (async () => {
    await prisma.$executeRaw`DELETE FROM public.online_presence WHERE last_seen < ${new Date(Date.now() - RETENTION_MS)}`
    cleanupAfter = Date.now() + PRESENCE_CLEANUP_INTERVAL_MS
  })()
  cleaning = pending
  try { await pending } finally { if (cleaning === pending) cleaning = null }
}
export async function getAdminPresence() {
  await requireSongAdmin()
  await cleanupPresence()
  const now = Date.now()
  const rows = await prisma.$queryRaw<PresenceRow[]>(visitsSince(new Date(now - RETENTION_MS)))
  const snapshot = presenceSnapshot(rows, now)
  // Cookie values are not exposed even to the admin browser; only short-lived row keys are needed.
  snapshot.visitors = snapshot.visitors.map(visitor => ({ ...visitor, id: createHash("sha256").update(visitor.id).digest("hex").slice(0, 20) }))
  return snapshot
}
