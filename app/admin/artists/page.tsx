import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; letter?: string }>
}) {
  const params = await searchParams

const search = params.search ?? ""
const category = params.category ?? ""
const letter = params.letter ?? ""
  const artists = await prisma.artist.findMany({
  where: {
  ...(search && {
    name: {
      contains: search,
      mode: "insensitive",
    },
  }),
  ...(category && {
    category,
  }),
  ...(letter && {
    name: {
      startsWith: letter,
      mode: "insensitive",
    },
  }),
},
  orderBy: { name: "asc" },
})

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold text-gray-900">
    Izvođači
  </h1>
  
  <form className="flex gap-3 mb-6">
  <input
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
              <th className="p-3 text-center">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr
                 key={artist.id}
                 className={`border-t
                 ${!artist.bio && !artist.discography ? "bg-red-50" : ""}
                 ${artist.bio && !artist.discography ? "bg-yellow-50" : ""}
                 ${artist.bio && artist.discography ? "bg-green-50" : ""}
         `}
  >
                <td className="p-3">
                       <Link
                       href={`/admin/artists/${artist.id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                     {artist.name}
                        </Link>
                 </td>
                <td className="p-3 text-gray-500">{artist.slug}</td>
                <td className="p-3">{artist.category ?? "-"}</td>
                <td className="p-3 text-center">
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
                  <Link
                    href={`/admin/artists/${artist.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}