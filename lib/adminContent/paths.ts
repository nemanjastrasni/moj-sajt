export type ArtistLocation = { slug: string; category: string | null }
export type ArtistReturn = "artist" | "bio" | "info"
export function artistPageHref(artist: ArtistLocation, destination: ArtistReturn = "artist") {
  if (!artist.category) return "/pesme"
  const parts = [artist.category, artist.slug].map(encodeURIComponent).join("/")
  return destination === "bio" ? "/biografija/" + parts : "/pesme/" + parts + (destination === "info" ? "/info" : "")
}
export function songPageHref(song: { slug: string; category: string }, artist: ArtistLocation) {
  return "/pesme/" + [artist.category || song.category, artist.slug, song.slug].map(encodeURIComponent).join("/")
}
