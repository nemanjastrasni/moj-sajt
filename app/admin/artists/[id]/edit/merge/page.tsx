import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { Merge } from "lucide-react"

export default async function MergeArtist({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ search?: string }>
}) {
  await requireSongAdmin()

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
    await requireSongAdmin()

    const targetId = formData.get("targetId") as string
    if (!targetId) {
  throw new Error("Izaberi izvođača za merge")
}
    const creditedSongs = await prisma.songPerformer.count({ where: { OR: [
      { artistId: { in: [id, targetId] } }, { song: { artistId: { in: [id, targetId] } } },
    ] } })
    if (creditedSongs) throw new Error("Ovi izvo\u0111a\u010di imaju povezane duete. Spajanje zahteva posebnu proveru veza; ni\u0161ta nije izmenjeno.")

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
    <section className="admin-page">

      <h1 className="text-xl font-bold mb-4">
        Spoji izvođača: {artist?.name}
      </h1>

      <p className="mb-4 admin-muted">
        Ovaj izvođač ima <b>{songsCount}</b> pesama.
      </p>
       
       <form method="GET" className="mb-3">
  <input
    name="search"
    defaultValue={search}
    placeholder="Pretraži izvođača..."
    className="ui-input" aria-label="Pretraži izvođača"
  />
</form>

      <form action={merge} className="flex gap-3 flex-col">
         <select
  name="targetId"
  className="ui-input" aria-label="Spoji sa izvođačem" required
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
  className="ui-button ui-button-primary"
>
  <Merge aria-hidden="true" />Spoji izvođače
</button>

      </form>
    </section>
  )
}
