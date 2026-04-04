import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AdminEdit({ searchParams }: any) {
  
  const q = searchParams?.q || ""
  const category = searchParams?.category || ""
  const artistLetter = searchParams?.artistLetter || ""

  const songs = await prisma.song.findMany({
    where: {
      ...(category && category !== "" ? { category } : {}),

      ...(q
        ? {
            OR: [
              {
                title: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                artist: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),

      ...(artistLetter === "#"
        ? {
            artist: {
              NOT: [
                { name: { startsWith: "#" } },
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
                { name: { startsWith: "X" } },
                { name: { startsWith: "W" } },
                { name: { startsWith: "Q" } },
              ],
            },
          }
        : artistLetter
        ? {
            artist: {
              name: {
                startsWith: artistLetter,
                mode: "insensitive",
              },
            },
          }
        : {}),
    },
    include: {
      artist: true,
    },
    orderBy: {
      artist: {
        name: "asc",
      },
    },
    take: 200,
  })

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">Edit tabela</h1>

      <form method="GET" className="mb-4 flex gap-2 items-center">

        <input
          name="q"
          defaultValue={q}
          placeholder="Search title..."
          className="p-2 border w-full"
        />

        <select
          name="category"
          defaultValue={category}
          className="p-2 border"
        >
          <option value="">All</option>
          <option value="domace">Domace</option>
          <option value="narodne">Narodne</option>
          <option value="strane">Strane</option>
        </select>

        <select
          name="artistLetter"
          defaultValue={artistLetter}
          className="p-2 border"
        >
          <option value="">Artist (svi)</option>
          <option value="#">#</option>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <button className="px-4 bg-gray-800 text-white">
          Filter
        </button>

      </form>

      <table className="w-full text-sm text-black">

        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left border-b border-gray-700">
            <th>Title</th>
            <th>Artist</th>
            <th>Category</th>
            <th>Bio</th>
            <th>Image</th>
            <th>Edit</th>
          </tr>
        </thead>

        <tbody>
          {songs.map((s) => (
            <tr key={s.id} className="border-b border-gray-800">

              <td>{s.title}</td>

              <td>{s.artist ? s.artist.name : "NO ARTIST"}</td>

              <td>{s.category}</td>

              <td className="max-w-[200px] truncate">
                {s.artist ? s.artist.bio || "-" : "-"}
              </td>

              <td>
                {s.artist ? (s.artist.image ? "YES" : "-") : "-"}
              </td>

              <td>
                <Link href={`/admin/songs/${s.id}`} className="text-blue-500">
                  Edit
                </Link>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  )
}