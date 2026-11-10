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
const photosByArtistId = new Map(manifest.photos.map(photo => [photo.artistId, photo]))
const managedImages = new Set(manifest.photos.map(photo => photo.image))

export function getArtistImage(artist: ArtistPhoto): string | null {
  const candidate = photosByArtistId.get(artist.id)
  const prepared = candidate?.artistName === artist.name && candidate.slug === artist.slug && candidate.category === artist.category ? candidate : undefined
  // Repair only the reviewed stale URL; preserve subsequent manual photo changes.
  if (prepared && (!artist.image?.trim() ||
    (artist.id === "cmmxst0n50068obh8fw7hq0av" && artist.image === babeBrokenImage))) return prepared.image
  return safeArtistImage(artist.image)
}

export function selectMosaicArtists<T extends ArtistPhoto & { _count: { songs: number } }>(artists: T[], limit = 12): T[] {
  return artists.map(artist => ({ artist, image: getArtistImage(artist) }))
    .filter(row => row.artist.slug && row.image)
    .sort((a, b) => Number(managedImages.has(b.image!)) - Number(managedImages.has(a.image!)) ||
      b.artist._count.songs - a.artist._count.songs || a.artist.name.localeCompare(b.artist.name, "sr-Latn") || a.artist.id.localeCompare(b.artist.id))
    .slice(0, limit)
    .map(row => row.artist)
}
