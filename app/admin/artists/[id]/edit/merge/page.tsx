import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function MergeArtist({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const { id } = await params

  const artist = await prisma.artist.findUnique({
    where: { id },
  })

  const search = ""

const artists = await prisma.artist.findMany({
  where: search
    ? {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {},
  orderBy: { name: "asc" },
})

  const songsCount = await prisma.song.count({
    where: { artistId: id },
  })

  async function merge(formData: FormData) {
    "use server"

    const targetId = formData.get("targetId") as string

    await prisma.song.updateMany({
      where: { artistId: id },
      data: { artistId: targetId },
    })

    await prisma.artist.delete({
      where: { id },
    })

    redirect("/admin/artists")
  }

  return (
    <div className="max-w-xl">

      <h1 className="text-xl font-bold mb-4">
        Merge {artist?.name}
      </h1>

      <p className="mb-4 text-sm text-gray-600">
        Ovaj izvođač ima <b>{songsCount}</b> pesama.
      </p>

      <form action={merge} className="flex gap-3 flex-col">
         <input
  name="targetId"
  list="artists"
  placeholder="Pretraži izvođača..."
  className="border p-2 rounded"
/>

<datalist id="artists">
  {artists
    .filter((a) => a.id !== id)
    .map((a) => (
      <option key={a.id} value={a.id}>
        {a.name}
      </option>
    ))}
</datalist>

        <button
          type="submit"
          className="bg-black text-white px-4 rounded"
        >
          Merge
        </button>

      </form>
    </div>
  )
}