export const OFFLINE_VERSION = 1
export const MAX_OFFLINE_SONGS = 100
export const MAX_OFFLINE_BYTES = 5 * 1024 * 1024
export type OfflineSong = { id: string; title: string; artist: string; lyrics: string; chords: string | null; transpose: number; capo: number | null }
export type OfflinePlaylist = { version: 1; id: string; ownerId: string; name: string; savedAt: string; signature: string; songs: OfflineSong[] }
export function offlineSignature(id: string, name: string, songs: { id: string; transpose: number; capo: number | null }[]) {
  return JSON.stringify([id, name, songs.map(song => [song.id, song.transpose, song.capo])])
}
export function isOfflinePlaylist(value: unknown): value is OfflinePlaylist {
  if (!value || typeof value !== "object") return false
  const p = value as OfflinePlaylist
  const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max
  return p.version === 1 && text(p.id, 128) && text(p.ownerId, 128) && text(p.name, 200) &&
    typeof p.savedAt === "string" && p.savedAt.length < 40 && Number.isFinite(Date.parse(p.savedAt)) &&
    Array.isArray(p.songs) && p.songs.length > 0 && p.songs.length <= MAX_OFFLINE_SONGS &&
    p.songs.every(s => s && text(s.id, 128) && text(s.title, 300) && text(s.artist, 1000) && typeof s.lyrics === "string" && s.lyrics.length <= 100000 &&
      (s.chords === null || typeof s.chords === "string" && s.chords.length <= 100000) && Number.isInteger(s.transpose) && Math.abs(s.transpose) <= 11 &&
      (s.capo === null || Number.isInteger(s.capo) && s.capo >= 0 && s.capo <= 12)) &&
    new Set(p.songs.map(s => s.id)).size === p.songs.length && p.signature === offlineSignature(p.id, p.name, p.songs)
}
