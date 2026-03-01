import Link from "next/link"
import { prisma } from "@/lib/prisma"

const letters = [
  "A","B","C","Č","Ć","D","Đ","E","F","G",
  "H","I","J","K","L","M","N","O","P","R",
  "S","Š","T","U","V","Z","Ž"
]

const categories = [
  { key: "domace", label: "Domaće" },
  { key: "strane", label: "Strane" },
  { key: "narodne", label: "Narodne" },
]

export default async function BiografijePage() {

  const artists = await prisma.artist.findMany({
    where: {
      category: { not: null },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-10">
        Biografije izvođača
      </h1>

      {categories.map((cat) => {

        const categoryArtists = artists.filter(
          (a) => a.category === cat.key
        )

        if (categoryArtists.length === 0) return null

        return (
          <div key={cat.key} className="mb-14">

            <h2 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-2">
              {cat.label}
            </h2>

            {letters.map((letter) => {

              const filtered = categoryArtists.filter((artist) =>
                artist.name.toUpperCase().startsWith(letter)
              )

              if (filtered.length === 0) return null

              return (
                <div key={letter} className="mb-6">
                  <h3 className="text-xl font-semibold mb-3">
                    {letter}
                  </h3>

                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filtered.map((artist) => (
                      <li key={artist.slug}>
                        <Link
                          href={`/pesme/${artist.category}/${artist.slug}/info`}
                          className="text-blue-400 hover:text-blue-300 hover:underline transition"
                        >
                          {artist.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}