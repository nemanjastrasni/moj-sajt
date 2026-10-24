import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { CategoryLabel } from "@/app/components/UiText"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"

export const dynamic = "force-dynamic"

function normalizeLetter(letter: string) {
  const decoded = decodeURIComponent(letter).toUpperCase()

  if (decoded === "DŽ") return "DŽ"
  if (decoded === "LJ") return "LJ"
  if (decoded === "NJ") return "NJ"

  return decoded
}

function getFirstLetter(name?: string) {

  if (!name) return ""

  const upper = name.trim().toUpperCase()

  if (upper.startsWith("DŽ")) return "DŽ"
  if (upper.startsWith("LJ")) return "LJ"
  if (upper.startsWith("NJ")) return "NJ"

  return upper[0]
}

export default async function LetterPage({ params }: any) {
  const { category, letter: rawLetter } = await params

  const letter = normalizeLetter(rawLetter)
  const isSpecial = letter === "#" || letter === "NUM"

  const artists = await prisma.artist.findMany({
  where: { category },
  orderBy: { name: "asc" },
  include: {
    songs: true,
  },
})

  const filtered = artists.filter((artist) => {
  const first = getFirstLetter(artist.name)

  if (isSpecial) {
  return !/^[A-ZČĆŽŠĐ]/.test(artist.name.trim().toUpperCase())
}

  return first === letter
})

  return (
    <div className={styles.page}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        <CategoryLabel value={category} /> – {letter}
      </h1>

      {filtered.length === 0 ? (
        <p>Nema izvođača na ovo slovo.</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map((artist) => (
  <Link
    key={artist.id}
    href={`/pesme/${category}/${artist.slug}`}
    className={styles.artistRow}
  >
    <ArtistImage src={getArtistImage(artist)} name={artist.name} />

    <span>
      {artist.name} ({artist.songs.length})
    </span>
  </Link>
))}
        </div>
      )}
    </div>
  )
}
