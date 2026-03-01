import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export async function generateMetadata(
  { params }: any
): Promise<Metadata> {

  const { category } = params
  const pretty = formatCategory(category)

  return {
    title: `${pretty} pesme – Akordi i tekstovi`,
    description: `Lista izvođača i pesama u kategoriji ${pretty}.`,
  }
}

export default async function CategoryPage({ params }: any) {

  const { category } = params

  const SR_LATIN = [
    "A","B","C","Č","Ć","D","DŽ","Đ","E","F","G","H",
    "I","J","K","L","LJ","M","N","NJ","O","P","R",
    "S","Š","T","U","V","Z","Ž"
  ]

  const artists = await prisma.artist.findMany({
    where: { category },
    orderBy: { name: "asc" },
  })

  if (!artists.length) {
    return <div style={{ padding: 40 }}>Nema izvođača.</div>
  }

  function getFirstLetter(name: string) {
    const upper = name.toUpperCase()
    if (upper.startsWith("DŽ")) return "DŽ"
    if (upper.startsWith("LJ")) return "LJ"
    if (upper.startsWith("NJ")) return "NJ"
    return upper.charAt(0)
  }

  const grouped: Record<string, typeof artists> = {}

  artists.forEach((artist) => {
    const letter = getFirstLetter(artist.name)
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(artist)
  })

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        Kategorija: {formatCategory(category)}
      </h1>

      {SR_LATIN.map((letter) => {
        if (!grouped[letter]) return null

        return (
          <div key={letter}>
            <h2>{letter}</h2>

            <div style={{ display: "grid", gap: "10px" }}>
              {grouped[letter].map((artist) => (
                <Link
                  key={artist.id}
                  href={`/pesme/${category}/${artist.slug}`}
                >
                  {artist.name}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}