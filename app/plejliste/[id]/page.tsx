import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function Page({ params }: any) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: params.id },
    include: {
  songs: {
    include: {
      song: {
        include: {
          artist: true,
        },
      },
    },
  },
},
  })

  if (!playlist) return <div>Ne postoji</div>

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        {playlist.name}
      </h1>

      {playlist.songs.map((s: any) => (
        <div
  key={s.id}
  style={{
    padding: "10px 0",
    borderBottom: "1px solid #222",
  }}
>
          
          <Link href={`/pesme/${s.song.category}/${s.song.artist.slug}/${s.song.slug}`}>
  <span className="text-gray-400">
    {s.song.artist?.name}
  </span>{" "}
  <span className="text-white">
    - {s.song.title}
  </span>
</Link>

        </div>
      ))}
    </div>
  )
}