import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const dynamic = "force-dynamic"

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category
}

function getFirstLetter(name: string) {
  const upper = name.trim().toUpperCase()

  if (upper.startsWith("DŽ")) return "DŽ"
  if (upper.startsWith("LJ")) return "LJ"
  if (upper.startsWith("NJ")) return "NJ"

  return upper[0]
}

export default async function LetterPage({ params }: any) {
  const { category, letter } = await params

  const artists = await prisma.artist.findMany({
    where: { category },
    orderBy: { name: "asc" },
  })

  const filtered = artists.filter(
    (artist) => getFirstLetter(artist.name) === letter.toUpperCase()
  )

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        {formatCategory(category)} – {letter.toUpperCase()}
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
              {artist.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}