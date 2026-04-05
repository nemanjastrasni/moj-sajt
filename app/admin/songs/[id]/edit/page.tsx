import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditSongPage({ params }: Props) {
  const { id } = await params

  const song = await prisma.song.findUnique({
    where: { id },
    include: { artist: true },
  })

  if (!song) {
    notFound()
  }

  const songId = song.id

  async function updateSong(formData: FormData) {
    "use server"

    const title = formData.get("title") as string
    const lyrics = formData.get("lyrics") as string
    const category = formData.get("category") as string

    await prisma.song.update({
      where: { id: songId },
      data: {
        title,
        lyrics,
        category,
      },
    })

    redirect("/admin/songs")
  }

  return (
    <div className="max-w-2xl text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Edit pesma</h1>

      <form action={updateSong} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Naslov</label>
          <input
            name="title"
            defaultValue={song.title}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Kategorija</label>
          <input
            name="category"
            defaultValue={song.category ?? ""}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Tekst</label>
          <textarea
            name="lyrics"
            defaultValue={song.lyrics ?? ""}
            rows={8}
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Sačuvaj izmene
        </button>
      </form>
    </div>
  )
}