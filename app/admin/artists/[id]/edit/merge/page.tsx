import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function MergeArtist({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ search?: string }>
}) {

  const { id } = await params

  const artist = await prisma.artist.findUnique({
    where: { id },
  })

  const sp = await searchParams
const search = sp?.search || ""

const artists = await prisma.artist.findMany({
  where: search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }
    : {},
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

  const songsCount = await prisma.song.count({
    where: { artistId: id },
  })

  async function merge(formData: FormData) {
    "use server"

    const targetId = formData.get("targetId") as string
    if (!targetId) {
  throw new Error("Izaberi izvođača za merge")
}

    const songs = await prisma.song.findMany({
  where: { artistId: id },
})

for (const song of songs) {
  let newSlug = song.slug
  let counter = 2

  while (true) {
    const exists = await prisma.song.findFirst({
      where: {
        artistId: targetId,
        slug: newSlug,
      },
    })

    if (!exists) break

    newSlug = `${song.slug}-${counter}`
    counter++
  }

  await prisma.song.update({
    where: { id: song.id },
    data: {
      artistId: targetId,
      slug: newSlug,
    },
  })
}

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
       
       <form method="GET" className="mb-3">
  <input
    name="search"
    defaultValue={search}
    placeholder="Pretraži izvođača..."
    className="border p-2 rounded w-full"
  />
</form>

      <form action={merge} className="flex gap-3 flex-col">
         <select
  name="targetId"
  className="border p-2 rounded w-full"
>
  <option value="">-- izaberi izvođača --</option> 
  {artists
    .filter((a) => a.id !== id)
    .map((a) => (
      <option key={a.id} value={a.id}>
        {a.name} ({a._count.songs})
      </option>
    ))}
</select>

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