export type SongPerformerView = { id: string; name: string; slug: string; category: string | null }
export const performerSelect = { orderBy: { position: "asc" as const }, select: { artist: { select: { id: true, name: true, slug: true, category: true } } } }
export function performerArtists(rows: { artist: SongPerformerView }[] | undefined) {
  return rows?.map(row => row.artist) ?? []
}
export function performerHref(artist: SongPerformerView) {
  return `/pesme/${encodeURIComponent(artist.category ?? "domace")}/${encodeURIComponent(artist.slug)}`
}
export function isResolvedCollaboration(songs: { performers: { artistId: string }[] }[]) {
  return songs.length > 0 && songs.every(song => new Set(song.performers.map(row => row.artistId)).size >= 2)
}
