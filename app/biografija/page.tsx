import Link from "next/link"
import { prisma } from "@/lib/prisma"

const letters = [
  "A","B","C","Č","Ć","D","Đ","E","F","G",
  "H","I","J","K","L","M","N","O","P","R",
  "S","Š","T","U","V","Z","Ž"
]

export default async function BiografijePage() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  })

  const grouped = letters.reduce((acc, letter) => {
    acc[letter] = artists.filter((artist) =>
      artist.name
        .toUpperCase()
        .startsWith(letter)
    )
    return acc
  }, {} as Record<string, typeof artists>)

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8">
        Biografije izvođača
      </h1>

      <div className="flex flex-wrap gap-3 mb-10">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#${letter}`}
            className="px-3 py-1 border border-gray-600 rounded hover:bg-gray-800"
          >
            {letter}
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {letters.map((letter) =>
          grouped[letter]?.length > 0 ? (
            <div key={letter} id={letter}>
              <h2 className="text-2xl font-semibold mb-4">
                {letter}
              </h2>

              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {grouped[letter].map((artist) => (
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
          ) : null
        )}
      </div>
    </div>
  )
}