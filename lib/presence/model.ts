export const ACTIVE_WINDOW_MS = 2 * 60 * 1000
export const RETENTION_MS = 10 * 60 * 1000
export const PRESENCE_EVENT = "gitarakordi-presence"
export type PresenceCounts = { total: number; loggedIn: number; guests: number; checkedAt: string }
export type PresenceRow = { visitor_id: string; user_id: string | null; last_seen: Date | string; country_code: string | null }
export type UserPresence = { online: boolean; lastSeen: string; countries: string[] }
export type PresenceSnapshot = PresenceCounts & { users: Record<string, UserPresence>; visitors: { id: string; lastSeen: string; countryCode: string | null }[] }
const regions = new Intl.DisplayNames(["en"], { type: "region" })
export function countryCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const code = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) && regions.of(code) !== code && !["ZZ", "EU", "UN", "EZ"].includes(code) ? code : null
}
export function countryName(value: unknown, locale = "sr") {
  const code = countryCode(value)
  return code ? new Intl.DisplayNames([locale === "en" ? "en" : "sr-Latn"], { type: "region" }).of(code) || code : null
}
export function publicPresence(value: PresenceCounts): PresenceCounts {
  return { total: value.total, loggedIn: value.loggedIn, guests: value.guests, checkedAt: value.checkedAt }
}
export function validCounts(value: unknown): value is PresenceCounts {
  if (!value || typeof value !== "object") return false
  const row = value as PresenceCounts
  return [row.total, row.loggedIn, row.guests].every(n => Number.isSafeInteger(n) && n >= 0) && row.total === row.loggedIn + row.guests && typeof row.checkedAt === "string" && Number.isFinite(Date.parse(row.checkedAt))
}
export function validSnapshot(value: unknown): value is PresenceSnapshot {
  if (!validCounts(value)) return false
  const snapshot = value as PresenceSnapshot
  if (!snapshot.users || typeof snapshot.users !== "object" || Array.isArray(snapshot.users) || !Array.isArray(snapshot.visitors)) return false
  const validTime = (time: unknown) => typeof time === "string" && Number.isFinite(Date.parse(time))
  return snapshot.visitors.length === snapshot.guests && Object.values(snapshot.users).filter(user => user?.online).length === snapshot.loggedIn
    && Object.values(snapshot.users).every(user => user && typeof user.online === "boolean" && validTime(user.lastSeen) && Array.isArray(user.countries) && user.countries.every(code => countryCode(code) === code))
    && snapshot.visitors.every(visitor => visitor && typeof visitor.id === "string" && validTime(visitor.lastSeen) && (visitor.countryCode === null || countryCode(visitor.countryCode) === visitor.countryCode))
}
export function presenceSnapshot(rows: PresenceRow[], now: number): PresenceSnapshot {
  const users: Record<string, UserPresence> = Object.create(null)
  const visitors: PresenceSnapshot["visitors"] = []
  const seen = new Set<string>()
  for (const row of [...rows].sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())) {
    const time = new Date(row.last_seen).getTime()
    if (!Number.isFinite(time) || time < now - RETENTION_MS || seen.has(row.visitor_id)) continue
    seen.add(row.visitor_id)
    const lastSeen = new Date(time).toISOString(), online = time >= now - ACTIVE_WINDOW_MS, code = countryCode(row.country_code)
    if (row.user_id) {
      const user = users[row.user_id] ??= { online: false, lastSeen, countries: [] }
      if (online) { user.online = true; if (code && !user.countries.includes(code)) user.countries.push(code) }
    } else if (online) visitors.push({ id: row.visitor_id, lastSeen, countryCode: code })
  }
  const loggedIn = Object.values(users).filter(user => user.online).length
  return { total: loggedIn + visitors.length, loggedIn, guests: visitors.length, checkedAt: new Date(now).toISOString(), users: { ...users }, visitors }
}
