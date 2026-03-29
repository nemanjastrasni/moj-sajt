import { prisma } from "@/lib/prisma"

export default async function AdminEdit({ searchParams }: any) {
  
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true }
  })
  const q = searchParams?.q || ""
  const category = searchParams?.category || ""
  const songs = await prisma.song.findMany({
  include: {
    artist: {
      select: {
        id: true,
        name: true,
        bio: true,
        image: true
      }
    }
  },
  orderBy: { category: "asc" },
  take: 200
})

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">Edit tabela</h1>

<form method="GET" className="mb-4 flex gap-2">

  <input
    name="q"
    defaultValue={q}
    placeholder="Search title..."
    className="p-2 border w-full"
  />

  <select
    name="category"
    defaultValue={category}
    className="p-2 border"
  >
    <option value="">All</option>
    <option value="domace">Domace</option>
    <option value="narodne">Narodne</option>
    <option value="strane">Strane</option>
  </select>

  <button className="px-4 bg-gray-800 text-white">
    Filter
  </button>

</form>

      <table className="w-full text-sm text-black">

        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left border-b border-gray-700">
            <th>Title</th>
            <th>Slug</th>
            <th>Artist</th>
            <th>ArtistId</th>
            <th>Category</th>
            <th>Bio</th>
            <th>Image</th>
            <th>Edit</th>
          </tr>
        </thead>

      <tbody>
  {songs.map((s) => (
    <tr key={s.id}>
      <td>{s.title}</td>
      <td>{s.slug}</td>
      <td>{s.artistId}</td>
    </tr>
  ))}
</tbody>

      </table>

    </div>
  )
}