import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const PAGE_SIZE = 10

type SearchParams = {
  q?: string
  category?: string
  sort?: string
  page?: string
  letter?: string
  artist?: string
}

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const q = params?.q ?? ""
  const letter = params?.letter ?? ""
  const artist = params?.artist ?? ""
  const category = params?.category ?? ""
  const page = Number(params?.page || 1)

  const where: Prisma.SongWhereInput = {
  ...(q && {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { artist: { name: { contains: q, mode: "insensitive" } } },
    ],
  }),
  ...(letter && {
    title: { startsWith: letter, mode: "insensitive" },
  }),
   ...(artist && {
    artist: {
      name: { contains: artist, mode: "insensitive" }
    }
  }),
  ...(category && {
  category
}),
 }
  const total = await prisma.song.count({ where })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const songs = await prisma.song.findMany({
    where,
    include: { artist: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  async function deleteSong(id: string) {
    "use server"
    await prisma.song.delete({
      where: { id },
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Pesme</h1>

        <div className="mt-2 mb-4">
  <Link
    href="/admin/songs/new"
    className="bg-black text-white px-4 py-2 text-sm rounded inline-block"
  >
    + Nova pesma
  </Link>
</div>
</div>

      <form className="flex gap-4 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Pretraga (naslov / izvođač)"
          className="border p-2 w-64 rounded"
        />
        <input
name="artist"
defaultValue={artist}
placeholder="Izvođač"
className="border p-2 w-48 rounded"
/>
        <select name="letter" defaultValue={letter} className="border p-2 rounded">
            <option value="">Sva slova</option>
             {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
<option key={l} value={l}>{l}</option>
    ))}
             </select>

        <select name="category" defaultValue={category} className="border p-2 rounded">
           <option value="">Sve kategorije</option>
           <option value="domace">Domaće</option>
           <option value="strane">Strane</option>
           <option value="narodne">Narodne</option>
           <option value="createdAt">Najnovije</option>
           <option value="title">Naslov A–Z</option>
        </select>

        <button className="bg-gray-800 text-white px-4 rounded">
          Primeni
        </button>
      </form>

      {songs.length === 0 ? (
        <p className="text-gray-500">Nema rezultata.</p>
      ) : (
        <table className="w-full table-auto text-sm border border-gray-200 rounded">
          <thead className="bg-gray-100 text-gray-900">
            <tr>
              <th className="p-3 text-left">Naslov</th>
              <th className="p-3 text-left">Izvođač</th>
              <th className="p-3 text-center">Kategorija</th>
              <th className="p-3 text-center">Akcije</th>
            </tr>
          </thead>

          <tbody>
            {songs.map((song, i) => (
              <tr
                key={song.id}
                className={`${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-200 transition text-gray-900`}
              >
                <td className="p-3">{song.title}</td>
                <td className="p-3">{song.artist.name}</td>
                <td className="p-3 text-center">{song.category || "-"}</td>

                <td className="p-3 text-center space-x-3">
                  <Link
                    href={`/admin/songs/${song.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>

                  <span className="text-gray-400">|</span>

                  <form
                    action={deleteSong.bind(null, song.id)}
                    className="inline"
                  >
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1
            return (
              <Link
                key={p}
                href={`?q=${q}&category=${category}&page=${p}`}
                className={`px-3 py-1 border rounded ${
                  p === page
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {p}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}