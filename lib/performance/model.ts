export type PerformanceSong = { id: string; title: string; artist: string; lyrics: string }
export type PerformanceSnapshot = { id: string; name: string; songs: { id: string; title: string; artist: string }[]; current: PerformanceSong }
export const MAX_PERFORMANCE_SONGS = 2000
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9_-]{1,128}$/i.test(value)
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max
export function isPerformanceSnapshot(value: unknown): value is PerformanceSnapshot {
  if (!value || typeof value !== "object") return false
  const data = value as PerformanceSnapshot
  if (!identifier(data.id) || !text(data.name, 1000) || !Array.isArray(data.songs) || !data.songs.length || data.songs.length > MAX_PERFORMANCE_SONGS) return false
  if (data.songs.some(song => !song || !identifier(song.id) || !text(song.title, 1000) || !text(song.artist, 1000)) || new Set(data.songs.map(song => song.id)).size !== data.songs.length) return false
  return Boolean(data.current && identifier(data.current.id) && data.songs.some(song => song.id === data.current.id) && text(data.current.title, 1000) && text(data.current.artist, 1000) && text(data.current.lyrics, 100000))
}
export function performanceHref(id: string, songId?: string) {
  return `/plejliste/${encodeURIComponent(id)}/sviranje${songId ? "?song=" + encodeURIComponent(songId) : ""}`
}
