import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"


export default async function EditArtistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const artist = await prisma.artist.findUnique({
    where: { id },
  })

  if (!artist) notFound()

  async function updateArtist(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const bio = formData.get("bio") as string
    const image = formData.get("image") as string
    const category = (formData.get("category") as string)?.toLowerCase().trim()
    const discographyRaw = formData.get("discography") as string

    let parsedDiscography: string[] = []

    if (discographyRaw?.trim()) {
      try {
        parsedDiscography = JSON.parse(discographyRaw)
      } catch {
        parsedDiscography = discographyRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      }
    }

    await prisma.artist.update({
      where: { id },
      data: {
        name,
        bio,
        image,
        category,
        discography: parsedDiscography,
      },
    })

    redirect("/admin/artists")
  }
  const artists = await prisma.artist.findMany({
  orderBy: { name: "asc" },
})

async function mergeArtist(formData: FormData) {
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
          <label className="block text-sm mb-1">Kategorija</label>
          <select
  name="category"
  defaultValue={artist.category ?? ""}
  className="border p-2 w-full rounded"
>
  <option value="">-- izaberi --</option>
  <option value="domace">Domaće</option>
  <option value="strane">Strane</option>
  <option value="narodne">Narodne</option>
</select>
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
          <label className="block text-sm mb-1">
            Diskografija (jedan album po redu ili JSON niz)
          </label>
          <textarea
            name="discography"
            defaultValue={
              Array.isArray(artist.discography)
                ? artist.discography.join("\n")
                : ""
            }
            rows={6}
            className="border p-2 w-full rounded"
          />
        </div>

        <button className="bg-black text-white px-4 py-2 rounded">
          Sačuvaj izmene
        </button>
      </form>
      <hr className="my-6" />

<h2 className="font-bold">Merge u drugog izvođača</h2>

<form action={mergeArtist} className="space-y-2">
  <select name="targetId" className="border p-2 w-full">
    {artists
      .filter((a) => a.id !== artist.id)
      .map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
  </select>

  <button className="bg-red-600 text-white px-4 py-2 rounded">
    MERGE
  </button>
</form>
    </div>
  )
}