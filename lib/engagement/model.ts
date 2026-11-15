export const activityKinds = ["active", "playlist_song", "performance", "music_play"] as const
export type ActivityKind = typeof activityKinds[number]
export type ActivityInput = { kind: ActivityKind; playlistId?: string; songId?: string }
export function activityInput(value: unknown): ActivityInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (!activityKinds.includes(row.kind as ActivityKind)) return null
  const kind = row.kind as ActivityKind
  if (Object.keys(row).some(key => !["kind", "playlistId", "songId"].includes(key))) return null
  const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value)
  if (kind === "active") return Object.keys(row).length === 1 ? { kind } : null
  if (!id(row.playlistId)) return null
  if (kind !== "music_play" && !id(row.songId)) return null
  return { kind, playlistId: row.playlistId, ...(kind !== "music_play" ? { songId: row.songId as string } : {}) }
}
export type UsageCounts = { active: number; repeat: number; playlist: number; performance: number; music: number }
export type EngagementReport = {
  startedAt: string; calculatedAt: string; eligible: number; optedIn: number
  seven: UsageCounts; thirty: UsageCounts
  cohort: { eligible: number; returned: number }
  inventory: { registrations: number; playlists: number; musicLists: number }
  days: { day: string; active: number; playlist: number; music: number }[]
}
export function returnRate(cohort: EngagementReport["cohort"]) {
  return cohort.eligible >= 5 ? Math.round(100 * cohort.returned / cohort.eligible) : null
}
