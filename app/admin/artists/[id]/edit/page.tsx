import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"

type Props = {
  params: { id: string }
}

export default async function EditArtistPage({ params }: Props) {
  const artist = await prisma.artist.findUnique({
    where: { id: params.id },
  })

  if (!artist) notFound()

  const artistId = artist.id

  async function updateArtist(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const bio = formData.get("bio") as string
    const image = formData.get("image") as string
    const category = (formData.get("category") as string)?.toLowerCase().trim()  // ✅ DODATO
    const discographyRaw = formData.get("discography") as string

    let parsedDiscography: string[] = []

if (discographyRaw?.trim()) {
  parsedDiscography = discographyRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

    if (discographyRaw?.trim()) {
      try {
        parsedDiscography = JSON.parse(discographyRaw)
      } catch {
        parsedDiscography = discographyRaw.split("\n").filter(Boolean)
      }
    }

    await prisma.artist.update({
      where: { id: artistId },
      data: {
        name,
        bio,
        image,
        category,          // ✅ DODATO
        discography: parsedDiscography,
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
          <label className="block text-sm mb-1">Kategorija</label>
          <input
            name="category"
            defaultValue={artist.category ?? ""}
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
    </div>
  )
}