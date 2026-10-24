import manifest from "../public/artist-photos/manifest.json"
import { safeArtistImage } from "./artistMedia"

type ArtistPhoto = {
  id: string
  name: string
  slug: string | null
  category: string | null
  image: string | null
}

const babeBrokenImage = "https://remixpress.com/wp-content/uploads/2015/09/Babe_foto_Dejan_Skopelja.jpg"

export function getArtistImage(artist: ArtistPhoto): string | null {
  const prepared = manifest.photos.find(photo => photo.artistId === artist.id &&
    photo.artistName === artist.name && photo.slug === artist.slug && photo.category === artist.category)
  // Repair only the reviewed stale URL; preserve subsequent manual photo changes.
  if (prepared && (!artist.image?.trim() ||
    (artist.id === "cmmxst0n50068obh8fw7hq0av" && artist.image === babeBrokenImage))) return prepared.image
  return safeArtistImage(artist.image)
}

export function selectMosaicArtists<T extends ArtistPhoto & { _count: { songs: number } }>(artists: T[], limit = 12): T[] {
  const managed = new Set(manifest.photos.map(photo => photo.image))
  return artists.filter(artist => artist.slug && getArtistImage(artist))
    .sort((a, b) => Number(managed.has(getArtistImage(b)!)) - Number(managed.has(getArtistImage(a)!)) ||
      b._count.songs - a._count.songs || a.name.localeCompare(b.name, "sr-Latn") || a.id.localeCompare(b.id))
    .slice(0, limit)
}
