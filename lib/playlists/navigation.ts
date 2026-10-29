export type PlaylistNavigation = { id: string; name: string; current: string; songs: { id: string; title: string; href: string }[] }
export function isPlaylistNavigation(value: unknown, id: string, current: string): value is PlaylistNavigation {
  if (!value || typeof value !== "object") return false
  const data = value as PlaylistNavigation
  if (data.id !== id || data.current !== current || typeof data.name !== "string" || data.name.length > 1000 || !Array.isArray(data.songs) || data.songs.length > 2000) return false
  if (data.songs.some(song => !song || typeof song.id !== "string" || !/^[a-z0-9_-]{1,128}$/i.test(song.id) || typeof song.title !== "string" || song.title.length > 1000 || typeof song.href !== "string" || !/^\/pesme\/[^/?#]+\/[^/?#]+\/[^/?#]+\?playlist=%2Fplejliste%2F[a-z0-9_-]+$/i.test(song.href) || !song.href.endsWith("?playlist=" + encodeURIComponent("/plejliste/" + id)))) return false
  return new Set(data.songs.map(song => song.id)).size === data.songs.length && data.songs.some(song => song.id === current)
}
