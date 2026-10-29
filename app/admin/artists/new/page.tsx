import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { Save } from "lucide-react"

export default async function NewArtistPage() {
  await requireSongAdmin()

  async function createArtist(formData: FormData) {
    "use server"
    await requireSongAdmin()

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
    <section className="admin-page">
      <h1>Novi izvođač</h1>

      <form action={createArtist} className="admin-form">

        <label>Ime<input name="name" required maxLength={200} className="ui-input"/></label>

        <label>Slug<input name="slug" className="ui-input"/></label>

        <label>Kategorija
          <select name="category" required className="ui-input">
            <option value="">-- izaberi --</option>
            <option value="domace">Zabavne</option>
            <option value="strane">Strane</option>
            <option value="narodne">Narodne</option>
          </select>
        </label>

        <label>Slika (URL)<input name="image" className="ui-input"/></label>

        <label>Biografija<textarea name="bio" rows={10} className="ui-input"/></label>

        <label>Diskografija<textarea name="discography" rows={10} className="ui-input"/></label>

        <div><button className="ui-button ui-button-primary"><Save aria-hidden="true" />Sačuvaj</button></div>

      </form>
    </section>
  )
}
