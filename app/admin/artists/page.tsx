import Link from "next/link"
import { prisma } from "@/lib/prisma"

async function deleteArtist(id: string) {
"use server"

await prisma.artist.delete({
where: { id }
})
}

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; letter?: string }>
}) {

  const params = await searchParams
  const search = params?.search || ""
  const category = params.category ?? ""
  const letter = params.letter ?? ""

 const artists = await prisma.artist.findMany({
  where: {
    AND: [
      ...(search
        ? [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ]
        : []),

      ...(letter && letter !== "#"
  ? [
      {
        name: {
          startsWith: letter,
          mode: "insensitive" as const,
        },
      },
    ]
  : []),

...(letter === "#"
  ? [
      {
        NOT: [
          { name: { startsWith: "A" } },
          { name: { startsWith: "B" } },
          { name: { startsWith: "C" } },
          { name: { startsWith: "Č" } },
          { name: { startsWith: "Ć" } },
          { name: { startsWith: "D" } },
          { name: { startsWith: "Đ" } },
          { name: { startsWith: "E" } },
          { name: { startsWith: "F" } },
          { name: { startsWith: "G" } },
          { name: { startsWith: "H" } },
          { name: { startsWith: "I" } },
          { name: { startsWith: "J" } },
          { name: { startsWith: "K" } },
          { name: { startsWith: "L" } },
          { name: { startsWith: "M" } },
          { name: { startsWith: "N" } },
          { name: { startsWith: "O" } },
          { name: { startsWith: "P" } },
          { name: { startsWith: "R" } },
          { name: { startsWith: "S" } },
          { name: { startsWith: "Š" } },
          { name: { startsWith: "T" } },
          { name: { startsWith: "U" } },
          { name: { startsWith: "V" } },
          { name: { startsWith: "Z" } },
          { name: { startsWith: "Ž" } },
        ],
      },
    ]
  : []),

      ...(category ? [{ category }] : []),
    ],
  },
  include: {
    _count: {
      select: { songs: true },
    },
  },
  orderBy: {
  songs: {
    _count: "desc",
  },
},
})
function getRowColor(count: number) {
  if (count === 0) return "bg-red-100"
  if (count < 5) return "bg-yellow-100"
  if (count > 50) return "bg-green-100"
  return ""
}

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Izvođači
        </h1>

        <form className="flex gap-3 mb-6">
          <input
            type="text"
            name="search"
            placeholder="Pretraga izvođača..."
            className="border p-2 rounded w-64"
            list="artists"
            defaultValue={search}
          />

          <datalist id="artists">
            {artists.map((artist) => (
              <option key={artist.id} value={artist.name} />
            ))}
          </datalist>

          <select name="letter" defaultValue={letter} className="border p-2 rounded">
            <option value="">Sva slova</option>
            {[
  "#",
  "A","B","C","Č","Ć","D","Đ","E","F","G","H",
  "I","J","K","L","M","N","O","P","R","S","Š",
  "T","U","V","Z","Ž"
].map((l) => (
  <option key={l} value={l}>
    {l}
  </option>
))}
          </select>

          <select name="category" defaultValue={category} className="border p-2 rounded">
            <option value="">Sve kategorije</option>
            <option value="domace">Domaće</option>
            <option value="strane">Strane</option>
            <option value="narodne">Narodne</option>
          </select>

          <button className="bg-gray-800 text-white px-4 rounded">
            Primeni
          </button>
        </form>

        <Link
          href="/admin/artists/new"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          + Novi izvođač
        </Link>
      </div>

      {artists.length === 0 ? (
        <p className="text-gray-500">Nema izvođača.</p>
      ) : (
        <table className="w-full text-sm border border-gray-200 bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Ime</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Kategorija</th>
              <th className="p-3 text-center">Slika</th>
              <th className="p-3 text-center">Pesama</th>
              <th className="p-3 text-center w-32">Akcije</th>
            </tr>
          </thead>

          <tbody>
  {artists.map((artist) => (
    <tr
      key={artist.id}
      className={`border-t ${getRowColor(artist._count.songs)}`}
      
    >
                <td className="p-3">
                  <Link
                   href={`/admin/artists/${artist.id}/edit?search=${search}&category=${category}&letter=${letter}`}
                   className="text-blue-600 hover:underline"
                  >
                    {artist.name}
                  </Link>

                  <Link
                    href={`/admin/artists/${artist.id}/edit/merge`}
                    className="text-purple-600 ml-2"
                  >
                    Merge
                  </Link>
                </td>

                <td className="p-3 text-gray-500">{artist.slug}</td>
                <td className="p-3">{artist.category ?? "-"}</td>
                <td className="p-3 text-center whitespace-nowrap">
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-12 h-12 object-cover rounded mx-auto"
                    />
                  ) : (
                    "—"
                  )}
                </td>

                <td className="p-3 text-center">
  {artist._count.songs}
</td>

<td className="p-3 text-center">
  <Link
    href={`/admin/artists/${artist.id}/edit`}
    className="text-blue-600 hover:underline font-semibold"
  >
    Edit
  </Link>

  <span className="mx-2 text-gray-400">|</span>

  <form action={deleteArtist.bind(null, artist.id)} className="inline">
    <button className="text-red-600 hover:underline">
      Delete
    </button>
  </form>
</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}