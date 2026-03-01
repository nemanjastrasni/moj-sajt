import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"

type Props = {
  params: {
    category: string
  }
}

function formatCategory(category: string) {
  if (category === "domace") return "Domaće"
  if (category === "strane") return "Strane"
  if (category === "narodne") return "Narodne"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { category } = await params
  const pretty = formatCategory(category)

  return {
    title: `${pretty} pesme – Akordi i tekstovi`,
    description: `Lista izvođača i pesama u kategoriji ${pretty}. Akordi i tekstovi na GitaraAkordi.`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params

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

  SR_LATIN.forEach((letter) => {
    if (grouped[letter]) {
      grouped[letter].sort((a, b) =>
        a.name.localeCompare(b.name, "sr-Latn", {
          sensitivity: "base"
        })
      )
    }
  })

  return (
    <div style={container}>
      <h1 style={title}>Kategorija: {formatCategory(category)}</h1>

      <div style={stickyNav}>
        {SR_LATIN.map((letter) => {
          const exists = grouped[letter]?.length > 0
          return exists ? (
            <a key={letter} href={`#${letter}`} style={navLetter}>
              {letter}
            </a>
          ) : (
            <span key={letter} style={{ ...navLetter, opacity: 0.3 }}>
              {letter}
            </span>
          )
        })}
      </div>

      {SR_LATIN.map((letter) => {
        if (!grouped[letter]) return null

        return (
          <div key={letter} id={letter} style={section}>
            <h2 style={letterTitle}>{letter}</h2>

            <div style={grid}>
              {grouped[letter].map((artist) => (
                <Link
                  key={artist.id}
                  href={`/pesme/${category}/${artist.slug}`}
                  style={card}
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

const container: React.CSSProperties = {
  padding: "40px",
  maxWidth: "1000px",
  margin: "0 auto",
  fontFamily: "Arial, sans-serif",
}

const title: React.CSSProperties = {
  fontSize: "32px",
  marginBottom: "20px",
}

const stickyNav: React.CSSProperties = {
  position: "sticky",
  top: 0,
  background: "#fff",
  padding: "10px 0",
  borderBottom: "1px solid #ddd",
  marginBottom: "30px",
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  zIndex: 10,
}

const navLetter: React.CSSProperties = {
  textDecoration: "none",
  fontWeight: "bold",
  color: "#333",
}

const section: React.CSSProperties = {
  marginBottom: "40px",
}

const letterTitle: React.CSSProperties = {
  fontSize: "24px",
  marginBottom: "15px",
  borderBottom: "2px solid #ddd",
  paddingBottom: "5px",
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "12px",
}

const card: React.CSSProperties = {
  padding: "12px",
  background: "#f4f4f4",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#222",
  fontWeight: "bold",
}