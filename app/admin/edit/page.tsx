import { prisma } from "@/lib/prisma"

export default async function AdminEdit({ searchParams }: any) {
  
  const artists = await prisma.artist.findMany({
  select: { id: true, name: true }
})
  const q = searchParams?.q || ""
  const category = searchParams?.category || ""
  
  const songs = await prisma.song.findMany({
    
    where: {
  ...(category ? { category } : {}),
  ...(q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { artist: { name: { contains: q, mode: "insensitive" } } }
        ]
      }
    : {})
},
    include: { artist: true },
    take: 100
  })

  return (
    <div className="p-6">

  <h1 className="text-2xl font-bold mb-6">Edit tabela</h1>

  <form className="mb-4 flex gap-2">

    <input
      name="q"
      defaultValue={searchParams?.q || ""}
      placeholder="Search title / artist..."
      className="p-2 bg-gray-900 border border-gray-700 w-full"
    />

    <select
      name="category"
      defaultValue={searchParams?.category || ""}
      className="p-2 bg-gray-900 border border-gray-700"
    >
      <option value="">All</option>
      <option value="domace">Domace</option>
      <option value="narodne">Narodne</option>
      <option value="strane">Strane</option>
    </select>

    <button className="px-4 bg-gray-800">Filter</button>

  </form>

  <table className="w-full text-sm text-black">

    <thead className="sticky top-0 bg-white z-10">
      <tr className="text-left border-b border-gray-700">
        <th>Title</th>
        <th>Slug</th>
        <th>Artist</th>
        <th>Artist Slug</th>
        <th>Category</th>
        <th>Edit</th>
      </tr>
    </thead>

    <tbody>
      {songs.map((s) => (
        <tr key={s.id} className="border-b border-gray-800">

          <td>
  <form action={`/api/admin/song/${s.id}`} method="POST">
    <input
      name="title"
      defaultValue={s.title}
      className="bg-transparent border-b border-gray-600 outline-none"
      onBlur={(e) => e.currentTarget.form?.submit()}
    />
  </form>
</td>
          <td>{s.slug}</td>
          <td>
  <form action={`/api/admin/song/${s.id}`} method="POST">
    <select
      name="artistId"
      defaultValue={s.artist?.id || ""}
      className="bg-gray-900 text-white"
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      <option value="">Select</option>
      {artists.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  </form>
</td>

          <td className="text-gray-500">{s.artist?.slug}</td>


          <td>
  <form action={`/api/admin/song/${s.id}`} method="POST">
    <select
      name="category"
      defaultValue={s.category || ""}
      className="bg-gray-900 text-white"
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      <option value="domace">Domace</option>
      <option value="narodne">Narodne</option>
      <option value="strane">Strane</option>
    </select>
  </form>
</td>

          <td>{s.slug}</td>


          <td>
            <a
              href={`/admin/songs/${s.id}`}
              className="text-blue-400 hover:underline"
            >
              Edit
            </a>
          </td>

        </tr>
      ))}
    </tbody>

  </table>

</div>

  )
}