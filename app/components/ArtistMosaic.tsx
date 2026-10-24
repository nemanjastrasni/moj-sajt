import Link from "next/link"
import ArtistImage from "./ArtistImage"
import { getArtistImage, selectMosaicArtists } from "@/lib/artistPhotos"
import styles from "./ArtistMedia.module.css"

type Artist = {
  id: string
  name: string
  slug: string | null
  category: string | null
  image: string | null
  _count: { songs: number }
}

export default function ArtistMosaic({ artists, category }: { artists: Artist[]; category: string }) {
  const featured = selectMosaicArtists(artists)
  if (!featured.length) return null
  return (
    <div className={styles.mosaic} data-artist-mosaic>
      {featured.map((artist, index) => (
        <Link key={artist.id} href={`/pesme/${category}/${artist.slug}`} className={styles.tileLink}>
          <ArtistImage src={getArtistImage(artist)} name={artist.name} variant="tile" priority={index < 4} />
          <span className={styles.tileName}>{artist.name}</span>
        </Link>
      ))}
    </div>
  )
}
