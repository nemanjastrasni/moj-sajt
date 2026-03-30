import { prisma } from "@/lib/prisma"
import Link from "next/link"



export default async function AdminEdit({ searchParams }: any) {
  
  const q = searchParams?.q || ""
  const category = searchParams?.category || ""
  const letter = searchParams?.letter || ""
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

  ...(letter === "#"
    ? {
        NOT: [
          { title: { startsWith: "A" } },
          { title: { startsWith: "B" } },
          { title: { startsWith: "C" } },
          { title: { startsWith: "Č" } },
          { title: { startsWith: "Ć" } },
          { title: { startsWith: "D" } },
          { title: { startsWith: "Đ" } },
          { title: { startsWith: "E" } },
          { title: { startsWith: "F" } },
          { title: { startsWith: "G" } },
          { title: { startsWith: "H" } },
          { title: { startsWith: "I" } },
          { title: { startsWith: "J" } },
          { title: { startsWith: "K" } },
          { title: { startsWith: "L" } },
          { title: { startsWith: "M" } },
          { title: { startsWith: "N" } },
          { title: { startsWith: "O" } },
          { title: { startsWith: "P" } },
          { title: { startsWith: "R" } },
          { title: { startsWith: "S" } },
          { title: { startsWith: "Š" } },
          { title: { startsWith: "T" } },
          { title: { startsWith: "U" } },
          { title: { startsWith: "V" } },
          { title: { startsWith: "Z" } },
          { title: { startsWith: "Ž" } },
        ],
      }
    : letter
    ? {
        title: {
          startsWith: letter,
          mode: "insensitive",
        },
      }
    : {}),

  ...(artistLetter === "#"
    ? {
        artist: {
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
      artist: true
    },
    orderBy: { category: "asc" },
    take: 200
  })

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">Edit tabela</h1>

      <form method="GET" className="mb-4 flex gap-2">
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
         
         <div className="flex flex-wrap gap-1 items-center mt-2">
  {["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((l) => (
    <Link
      key={l}
      href={`?q=${q}&category=${category}&letter=${letter}&artistLetter=${l}`}
      className={`px-2 py-1 border rounded text-sm ${
        searchParams?.artistLetter === l ? "bg-black text-white" : ""
      }`}
    >
      {l} (artist)
    </Link>
  ))}
</div>

        <div className="flex flex-wrap gap-1 items-center">
  {["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((l) => (
    <Link
      key={l}
      href={`?q=${q}&category=${category}&letter=${l}`}
      className={`px-2 py-1 border rounded text-sm ${
        searchParams?.letter === l ? "bg-black text-white" : ""
      }`}
    >
      {l}
    </Link>
  ))}
</div>

        <button className="px-4 bg-gray-800 text-white">
          Filter
        </button>
      </form>

      <table className="w-full text-sm text-black">

        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left border-b border-gray-700">
            <th>Title</th>
            <th>Slug</th>
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

              <td>{s.slug}</td>

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