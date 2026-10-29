import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getCategoryLabel } from "@/lib/categories"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { Plus, Search, Pencil, Merge } from "lucide-react"
import Image from "next/image"
import { revalidatePath } from "next/cache"
import ConfirmSubmitButton from "../ConfirmSubmitButton"

async function deleteArtist(id: string) {
"use server"
await requireSongAdmin()
await prisma.artist.delete({
where: { id }
})
revalidatePath("/admin/artists")
}

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; letter?: string }>
}) {
  await requireSongAdmin()

  const params = await searchParams
  const search = params?.search || ""
  const category = params?.category || ""
  const letter = params?.letter || ""

 const artists = await prisma.artist.findMany({
  where: {
    AND: [
      ...(search
        ? [
            {
              name: {
                contains: search,
              },
            },
          ]
        : []),

      ...(letter && letter !== "#"
  ? [
      {
        name: {
          startsWith: letter,
        },
      },
    ]
  : []),

...(letter === "#"
  ? [
      {
        NOT: [
          { name: { startsWith: "A" } },
          { name: { startsWith: "B" } },
          { name: { startsWith: "C" } },
          { name: { startsWith: "Č" } },
          { name: { startsWith: "Ć" } },
          { name: { startsWith: "D" } },
          { name: { startsWith: "Đ" } },
          { name: { startsWith: "E" } },
          { name: { startsWith: "F" } },
          { name: { startsWith: "G" } },
          { name: { startsWith: "H" } },
          { name: { startsWith: "I" } },
          { name: { startsWith: "J" } },
          { name: { startsWith: "K" } },
          { name: { startsWith: "L" } },
          { name: { startsWith: "M" } },
          { name: { startsWith: "N" } },
          { name: { startsWith: "O" } },
          { name: { startsWith: "P" } },
          { name: { startsWith: "R" } },
          { name: { startsWith: "S" } },
          { name: { startsWith: "Š" } },
          { name: { startsWith: "T" } },
          { name: { startsWith: "U" } },
          { name: { startsWith: "V" } },
          { name: { startsWith: "Z" } },
          { name: { startsWith: "Ž" } },
        ],
      },
    ]
  : []),

      ...(category ? [{ category }] : []),
    ],
  },
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

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <h1>
          Izvođači
        </h1>

        <Link href="/admin/artists/new" className="ui-button ui-button-primary"><Plus aria-hidden="true" />Novi izvođač</Link>
      </div>
        <form method="GET" action="/admin/artists" className="admin-filters">
          <label>Pretraga
          <input
            type="text"
            name="search"
            placeholder="Pretraga izvođača..."
            className="ui-input"
            list="artists"
            defaultValue={search}
          />
          </label>

          <datalist id="artists">
            {artists.map((artist) => (
              <option key={artist.id} value={artist.name} />
            ))}
          </datalist>

          <label>Slovo<select name="letter" defaultValue={letter} className="ui-input">
            <option value="">Sva slova</option>
            {[
  "#",
  "A","B","C","Č","Ć","D","Đ","E","F","G","H",
  "I","J","K","L","M","N","O","P","R","S","Š",
  "T","U","V","Z","Ž"
].map((l) => (
  <option key={l} value={l}>
    {l}
  </option>
))}
          </select></label>

          <label>Kategorija<select name="category" defaultValue={category} className="ui-input">
            <option value="">Sve kategorije</option>
            <option value="domace">Zabavne</option>
            <option value="strane">Strane</option>
            <option value="narodne">Narodne</option>
          </select></label>

          <button className="ui-button">
            <Search aria-hidden="true" />Primeni
          </button>
        </form>

      <p className="admin-muted mb-4">Ukupno u pregledu: {artists.length}</p>

      {artists.length === 0 ? (
        <p className="admin-muted">Nema izvođača.</p>
      ) : (
        <div className="admin-table-scroll" role="region" aria-label="Izvođači" tabIndex={0}><table className="admin-table admin-artists">
          <thead>
            <tr>
              <th className="p-3 text-left">Ime</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Kategorija</th>
              <th className="p-3 text-center">Slika</th>
              <th className="p-3 text-center">Pesama</th>
              <th className="p-3 text-center w-32">Akcije</th>
            </tr>
          </thead>

          <tbody>
  {artists.map((artist) => (
    <tr
      key={artist.id}
      
    >
                <td className="p-3">
                  <Link
                   href={`/admin/artists/${artist.id}/edit?search=${search}&category=${category}&letter=${letter}`}
                  >
                    {artist.name}
                  </Link>

                </td>

                <td className="p-3 admin-muted">{artist.slug}</td>
                <td className="p-3">{getCategoryLabel(artist.category) || "-"}</td>
                <td className="p-3 text-center whitespace-nowrap">
                  {artist.image ? (
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      width={40} height={40} unoptimized className="admin-avatar"
                    />
                  ) : (
                    "—"
                  )}
                </td>

                <td className="p-3 text-center">
  {artist._count.songs}
</td>

<td className="p-3"><div className="admin-row-actions">
  <Link
    href={`/admin/artists/${artist.id}/edit?search=${search}&category=${category}&letter=${letter}`}
    className="ui-button" title="Izmeni izvođača" aria-label={`Izmeni: ${artist.name}`}
  >
    <Pencil aria-hidden="true" />
  </Link>

  <Link href={`/admin/artists/${artist.id}/edit/merge`} className="ui-button" title="Spoji izvođače" aria-label={`Spoji: ${artist.name}`}><Merge aria-hidden="true" /></Link>

  <form action={deleteArtist.bind(null, artist.id)} className="inline">
    <ConfirmSubmitButton name={artist.name} label="Obriši" description={`Ovo je trajno brisanje celog izvođača i njegovih ${artist._count.songs} pesama, ne samo biografije.`} />
  </form>
</div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </section>
  )
}
