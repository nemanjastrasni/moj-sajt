import { prisma } from "@/lib/prisma"

export default async function AdminEdit({ searchParams }: any) {
  
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true }
  })

  const songs = await prisma.song.findMany({
    take: 10
  })

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">Edit tabela</h1>

      <table className="w-full text-sm text-black">

        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left border-b border-gray-700">
            <th>Title</th>
            <th>Slug</th>
            <th>ArtistId</th>
            <th>Category</th>
            <th>Edit</th>
          </tr>
        </thead>

        <tbody>
          {songs.map((s) => (
            <tr key={s.id} className="border-b border-gray-800">

              <td>{s.title}</td>
              <td>{s.slug}</td>
              <td>{s.artistId}</td>
              <td>{s.category}</td>

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