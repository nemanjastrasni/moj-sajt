import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category
}

function normalizeLetter(letter: string) {
  const decoded = decodeURIComponent(letter).toUpperCase()

  if (decoded === "DŽ") return "DŽ"
  if (decoded === "LJ") return "LJ"
  if (decoded === "NJ") return "NJ"

  return decoded
}

function getFirstLetter(name: string) {
  const upper = name.trim().toUpperCase()

  if (upper.startsWith("DŽ")) return "DŽ"
  if (upper.startsWith("LJ")) return "LJ"
  if (upper.startsWith("NJ")) return "NJ"

  return upper[0]
}

export default async function LetterPage({ params }: any) {
  const { category, letter: rawLetter } = await params

  const letter = normalizeLetter(rawLetter)
  const isSpecial = letter === "#"

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
    return !/^[A-ZČĆŽŠĐ]/.test(first)
  }

  return first === letter
})

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        {formatCategory(category)} – {letter}
      </h1>

      {filtered.length === 0 ? (
        <p>Nema izvođača na ovo slovo.</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filtered.map((artist) => (
            <Link
              key={artist.id}
              href={`/pesme/${category}/${artist.slug}`}
            >
              {artist.name} ({artist.songs.length})
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}