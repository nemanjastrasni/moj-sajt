import { performanceHref } from "./model"

export type PlaybackTarget = { kind: "song"; songId: string } | { kind: "playlist"; songId: string; playlistId: string }
export type RecentPlayback = PlaybackTarget & { version: 1; at: number }
export type ResumeItem = PlaybackTarget & { href: string; title: string; artist: string; playlistName?: string }
const MAX_AGE = 90 * 86400000
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9_-]{1,128}$/i.test(value)

export function playbackTarget(value: unknown): PlaybackTarget | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (!identifier(data.songId)) return null
  if (data.kind === "song") return { kind: "song", songId: data.songId }
  if (data.kind === "playlist" && identifier(data.playlistId)) return { kind: "playlist", songId: data.songId, playlistId: data.playlistId }
  return null
}
export function parseRecentPlayback(raw: string | null, now = Date.now()): RecentPlayback | null {
  if (!raw || raw.length > 1024) return null
  try {
    const value = JSON.parse(raw), target = playbackTarget(value)
    return target && value.version === 1 && Number.isSafeInteger(value.at) && value.at > 0 && value.at <= now + 300000 && value.at >= now - MAX_AGE ? { ...target, version: 1, at: value.at } : null
  } catch { return null }
}
export function playbackKey(userId: string) {
  return identifier(userId) ? `gitarakordi-recent-playback-v1:${userId}` : null
}
export const PLAYBACK_EVENT = "gitarakordi-recent-playback-change"
export function readRecentPlayback(userId: string): string | null {
  try { const key = playbackKey(userId); return key ? localStorage.getItem(key) : null } catch { return null }
}
export function rememberPlayback(userId: string, input: PlaybackTarget, now = Date.now()) {
  const target = playbackTarget(input), key = playbackKey(userId)
  if (!target || !key || !Number.isSafeInteger(now) || now <= 0) return
  try {
    const value = JSON.stringify({ ...target, version: 1, at: now })
    localStorage.setItem(key, value)
    window.dispatchEvent(new Event(PLAYBACK_EVENT))
  } catch {}
}
export function forgetPlayback(userId: string) {
  try { const key = playbackKey(userId); if (key) { localStorage.removeItem(key); window.dispatchEvent(new Event(PLAYBACK_EVENT)) } } catch {}
}
export function resumeQuery(target: PlaybackTarget) {
  return new URLSearchParams({ kind: target.kind, songId: target.songId, ...(target.kind === "playlist" ? { playlistId: target.playlistId } : {}) }).toString()
}
export function isResumeItem(value: unknown, expected: PlaybackTarget): value is ResumeItem {
  if (!value || typeof value !== "object") return false
  const item = value as ResumeItem, target = playbackTarget(item)
  if (!target || target.kind !== expected.kind || target.songId !== expected.songId || target.kind === "playlist" && (expected.kind !== "playlist" || target.playlistId !== expected.playlistId)) return false
  if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 400 || typeof item.artist !== "string" || item.artist.length > 400 || typeof item.href !== "string") return false
  if (target.kind === "playlist") return typeof item.playlistName === "string" && item.playlistName.length <= 1000 && item.href === performanceHref(target.playlistId, target.songId)
  return /^\/pesme\/[^/?#]+\/[^/?#]+\/[^/?#]+\?from=favorites&play=1$/.test(item.href) && !/[\u0000-\u0020\\]/.test(item.href)
}
