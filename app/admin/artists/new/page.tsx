import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default function NewArtistPage() {

  async function createArtist(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    let slug = (formData.get("slug") as string)?.toLowerCase().trim()

if (!slug) {
  slug = (formData.get("name") as string)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
}
    
    const category = (formData.get("category") as string)?.toLowerCase().trim()
    const image = formData.get("image") as string
    const bio = formData.get("bio") as string
    const discographyRaw = formData.get("discography") as string

    const discography = discographyRaw
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const exists = await prisma.artist.findFirst({
      where: { slug }
   })

      if (exists) {
      throw new Error("Artist already exists")
  }
    await prisma.artist.create({
      data: {
        name,
        slug,
        category,
        image,
        bio,
        discography
      },
    })

    redirect("/admin/artists")
  }

  return (
    <div className="max-w-2xl text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Novi izvođač</h1>

      <form action={createArtist} className="space-y-4">

        <div>
          <label className="block text-sm mb-1">Ime</label>
          <input name="name" className="border p-2 w-full rounded"/>
        </div>

        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input name="slug" className="border p-2 w-full rounded"/>
        </div>

        <div>
          <label className="block text-sm mb-1">Kategorija</label>
          <select name="category" className="border p-2 w-full rounded">
            <option value="">-- izaberi --</option>
            <option value="domace">Domaće</option>
            <option value="strane">Strane</option>
            <option value="narodne">Narodne</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Slika (URL)</label>
          <input name="image" className="border p-2 w-full rounded"/>
        </div>

        <div>
          <label className="block text-sm mb-1">Biografija</label>
          <textarea name="bio" rows={6} className="border p-2 w-full rounded"/>
        </div>

        <div>
          <label className="block text-sm mb-1">Diskografija</label>
          <textarea name="discography" rows={6} className="border p-2 w-full rounded"/>
        </div>

        <button className="bg-black text-white px-4 py-2 rounded">
          Sačuvaj
        </button>

      </form>
    </div>
  )
}