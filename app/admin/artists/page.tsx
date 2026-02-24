import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function AdminArtistsPage() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Izvođači
      </h1>

      {artists.length === 0 ? (
        <p className="text-gray-500">Nema izvođača.</p>
      ) : (
        <table className="w-full text-sm border border-gray-200 bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Ime</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Kategorija</th>
              <th className="p-3 text-center">Slika</th>
              <th className="p-3 text-center">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr key={artist.id} className="border-t">
                <td className="p-3">{artist.name}</td>
                <td className="p-3 text-gray-500">{artist.slug}</td>
                <td className="p-3">{artist.category ?? "-"}</td>
                <td className="p-3 text-center">
                  {artist.image ? "✔" : "—"}
                </td>
                <td className="p-3 text-center">
                  <Link
                    href={`/admin/artists/${artist.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}