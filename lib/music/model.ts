export const musicCategories = ["Domace", "Strane", "Narodne", "Mix"] as const
export type MusicCategory = typeof musicCategories[number]
export type YouTubeSource = { kind: "video"; id: string } | { kind: "playlist"; id: string }
export type MusicItem = { id: string; title: string; url: string; type: string; order: number; source: YouTubeSource | null }
export type MusicList = { id: string; name: string; category: string | null; isPublic: boolean; editable: boolean; version: string; items: MusicItem[] }
export type MusicSummary = { id: string; name: string; category: string | null; isPublic: boolean; count: number; views: number; likes: number; liked: boolean; author: string | null }
export const musicId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value)
export class MusicError extends Error { constructor(public status: number, message: string) { super(message) } }
export function youtubeSource(value: unknown): YouTubeSource | null {
  if (typeof value !== "string" || value.length > 2000) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    const host = url.hostname.toLowerCase(), parts = url.pathname.split("/").filter(Boolean)
    const youtube = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)
    let id: string | null = null
    if (host === "youtu.be" && parts.length === 1) id = parts[0]
    else if ((youtube || host === "www.youtube-nocookie.com") && parts.length === 2 && ["embed", "shorts", "live"].includes(parts[0])) id = parts[1]
    else if (youtube && url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v")
    if (id && /^[\w-]{11}$/.test(id)) return { kind: "video", id }
    if (youtube && url.pathname === "/playlist" && url.searchParams.getAll("list").length === 1) {
      const list = url.searchParams.get("list")!
      if (/^[\w-]{10,100}$/.test(list)) return { kind: "playlist", id: list }
    }
  } catch {}
  return null
}
export function canonicalYoutube(source: YouTubeSource) {
  return source.kind === "video" ? `https://www.youtube.com/watch?v=${source.id}` : `https://www.youtube.com/playlist?list=${source.id}`
}
export function externalMusicUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && !url.port && (["open.spotify.com", "soundcloud.com", "www.soundcloud.com", "bandcamp.com", "mixcloud.com", "www.mixcloud.com"].includes(url.hostname)||url.hostname.endsWith(".bandcamp.com")) ? url.href : null
  } catch { return null }
}
export function musicName(value: unknown) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new MusicError(400, "Neispravan naziv liste.")
  const name = value.trim()
  if (!name || name.length > 120) throw new MusicError(400, "Naziv liste mora imati od 1 do 120 znakova.")
  return name
}
export function musicCategory(value: unknown): MusicCategory {
  if (!(musicCategories as readonly unknown[]).includes(value)) throw new MusicError(400, "Izaberi kategoriju.")
  return value as MusicCategory
}
export function expectedVersion(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new MusicError(400, "Osvezi muzicku listu pre izmene.")
  return value
}
export function nextMusicIndex(index: number, count: number, shuffle: boolean, random = Math.random): number | null {
  if (count <= 1) return null
  if (!shuffle) return index + 1 < count ? index + 1 : null
  const offset = Math.min(count - 2, Math.floor(Math.max(0, random()) * (count - 1))) + 1
  return (index + offset) % count
}
