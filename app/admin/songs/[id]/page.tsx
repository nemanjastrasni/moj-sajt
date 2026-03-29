import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function SongEdit({ params }: any) {

  const song = await prisma.song.findUnique({
    where: { id: params.id },
    include: { artist: true }
  })

  if (!song) return notFound()

  const artists = await prisma.artist.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })

  return (
    <div className="p-6 text-black">

      <h1 className="text-2xl mb-4">Edit song</h1>

      <form action={`/api/admin/song/${song.id}`} method="POST" className="flex flex-col gap-4">

        {/* TITLE */}
        <input
          name="title"
          defaultValue={song.title}
          className="border p-2"
        />

        {/* ARTIST SELECT */}
        <select
          name="artistId"
          defaultValue={song.artistId}
          className="border p-2"
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* CATEGORY */}
        <select
          name="category"
          defaultValue={song.category}
          className="border p-2"
        >
          <option value="domace">Domace</option>
          <option value="narodne">Narodne</option>
          <option value="strane">Strane</option>
        </select>

        {/* LYRICS */}
        <textarea
          name="lyrics"
          defaultValue={song.lyrics}
          rows={10}
          className="border p-2"
        />

        <button className="bg-black text-white p-2">
          SAVE
        </button>

      </form>

    </div>
  )
}