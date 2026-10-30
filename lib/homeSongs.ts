export type HomeSongKind = "popular" | "latest"
export type HomeSong = { id: string; title: string; slug: string; category: string; artist: { name: string; slug: string } }
export function isHomeSongList(value: unknown): value is HomeSong[] {
  return Array.isArray(value) && value.length <= 5 && value.every(song => song && typeof song.id === "string" && typeof song.title === "string" && typeof song.slug === "string" && typeof song.category === "string" && song.artist && typeof song.artist.name === "string" && typeof song.artist.slug === "string")
}
