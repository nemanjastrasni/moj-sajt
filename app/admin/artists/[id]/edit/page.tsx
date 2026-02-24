import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"

type Props = {
  params: { id: string }
}

export default async function EditArtistPage({ params }: Props) {
  const artist = await prisma.artist.findUnique({
    where: { id: params.id },
  })

  if (!artist) {
    notFound()
  }

  const artistId = artist.id

  async function updateArtist(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const bio = formData.get("bio") as string
    const image = formData.get("image") as string
    const discography = formData.get("discography") as string

    await prisma.artist.update({
      where: { id: artistId },
      data: {
        name,
        bio,
        image,
        discography,
      },
    })

    redirect("/admin/artists")
  }

  return (
    <div className="max-w-2xl text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Edit izvođač</h1>

      <form action={updateArtist} className="space-y-4">

        <div>
          <label className="block text-sm mb-1">Ime</label>
          <input
            name="name"
            defaultValue={artist.name}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Slika (URL)</label>
          <input
            name="image"
            defaultValue={artist.image ?? ""}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Biografija</label>
          <textarea
            name="bio"
            defaultValue={artist.bio ?? ""}
            rows={6}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
  <label className="block text-sm mb-1">Diskografija</label>
  <textarea
    name="discography"
    defaultValue={String(artist.discography ?? "")}
    rows={4}
    className="border p-2 w-full rounded"
  />
</div>

<button className="bg-black text-white px-4 py-2 rounded">
  Sačuvaj izmene
</button>

      </form>
    </div>
  )
}