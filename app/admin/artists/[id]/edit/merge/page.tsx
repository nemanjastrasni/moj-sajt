import { prisma } from "@/lib/prisma"

export default async function MergeArtist({ params }: { params: { id: string } }) {
  const artist = await prisma.artist.findUnique({
    where: { id: params.id }
  })

  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" }
  })

  async function merge(formData: FormData) {
    "use server"

    const targetId = formData.get("targetId") as string

    await prisma.song.updateMany({
      where: { artistId: params.id },
      data: { artistId: targetId }
    })
  }

  return (
    <div>
      <h1>Merge {artist?.name}</h1>

      <form action={merge}>
        <select name="targetId">
          {artists.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <button type="submit">Merge</button>
      </form>
    </div>
  )
}