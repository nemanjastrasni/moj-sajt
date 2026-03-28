import { prisma } from "@/lib/prisma"

export default async function AdminEdit({ searchParams }: any) {

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

    <thead>
      <tr className="text-left border-b border-gray-700">
        <th>Title</th>
        <th>Slug</th>
        <th>Artist</th>
        <th>Artist Slug</th>
        <th>Category</th>
        <th>Slug</th>
        <th>Edit</th>
      </tr>
    </thead>

    <tbody>
      {songs.map((s) => (
        <tr key={s.id} className="border-b border-gray-800">

          <td>{s.title}</td>
          <td>{s.slug}</td>
          <td>{s.artist?.name}</td>
          <td>{s.artist?.slug}</td>
          <td>{s.category}</td>
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