// app/admin/songs/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const PAGE_SIZE = 10

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams?: { q?: string; sort?: string; page?: string }
}) {
  const q = searchParams?.q ?? ""
  const sort = searchParams?.sort ?? "createdAt"
  const page = Number(searchParams?.page || 1)

  const where: Prisma.SongWhereInput = q
  ? {
      OR: [
        {
          title: {
            contains: q,
          },
        },
        {
          artist: {
            name: {
              contains: q,
            },
          },
        },
      ],
    }
  : {}

  const total = await prisma.song.count({ where })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const songs = await prisma.song.findMany({
    where,
    include: { artist: true },
    orderBy:
      sort === "title"
        ? { title: "asc" }
        : { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pesme</h1>

        <Link
          href="/admin/songs/new"
          className="bg-black text-white px-4 py-2 text-sm rounded"
        >
          + Nova pesma
        </Link>
      </div>

      {/* SEARCH + SORT */}
      <form className="flex gap-4 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Pretraga (naslov / izvođač)"
          className="border p-2 w-64 rounded"
        />

        <select
          name="sort"
          defaultValue={sort}
          className="border p-2 rounded"
        >
          <option value="createdAt">Najnovije</option>
          <option value="title">Naslov A–Z</option>
        </select>

        <button className="bg-gray-800 text-white px-4 rounded">
          Primeni
        </button>
      </form>

      {/* TABLE */}
      {songs.length === 0 ? (
        <p className="text-gray-500">Nema rezultata.</p>
      ) : (
        <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
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
                <td className="p-3 text-center">
                  {song.category || "-"}
                </td>
                <td className="p-3 text-center space-x-3">
                  <Link
                    href={`/admin/songs/${song.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>

                  <span className="text-gray-400">|</span>

                  <form
                    action={`/admin/songs/${song.id}/delete`}
                    method="POST"
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1
            return (
              <Link
                key={p}
                href={`?q=${q}&sort=${sort}&page=${p}`}
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