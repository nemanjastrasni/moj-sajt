import Link from "next/link"
import ArtistImage from "@/app/components/ArtistImage"
import UiText, { CategoryLabel } from "@/app/components/UiText"
import { getArtistImage } from "@/lib/artistPhotos"
import { artistsForBiographyLetter, biographyLetters, type BiographyArtist } from "@/lib/biographies/catalog"
import styles from "@/app/components/ArtistMedia.module.css"

export function BiographyLetters({ category, artists }: { category: string; artists: BiographyArtist[] }) {
  const letters = biographyLetters(artists)
  return <div className={styles.page}>
    <h1 className={styles.heading}><CategoryLabel value={category} /></h1>
    {letters.length ? <nav className={styles.letters} aria-label="A-Z">
      {letters.map(letter => <Link key={letter} href={`/biografija/${encodeURIComponent(category)}/slovo/${letter === "#" ? "num" : encodeURIComponent(letter.toLowerCase())}`}>{letter}</Link>)}
    </nav> : <p><UiText text="Nema dostupnih biografija ili diskografija." /></p>}
  </div>
}

export function BiographyArtists({ category, letter, artists }: { category: string; letter: string; artists: BiographyArtist[] }) {
  const selected = artistsForBiographyLetter(artists, letter)
  return <div className={styles.page}>
    <h1 className={styles.heading}><UiText text="Izvođači" /> - {letter.toUpperCase()}</h1>
    {selected.length ? <ul>
      {selected.map(artist => <li key={artist.id}>
        <Link href={`/biografija/${encodeURIComponent(category)}/${encodeURIComponent(artist.slug)}`} className={styles.artistRow}>
          <ArtistImage src={getArtistImage(artist)} name={artist.name} />
          <span>{artist.name}</span>
        </Link>
      </li>)}
    </ul> : <p><UiText text="Nema dostupnih biografija ili diskografija." /></p>}
  </div>
}
