import { prisma } from "@/lib/prisma"

export default async function Page({ params }: any) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: params.id },
    include: {
      songs: {
        include: { song: true },
      },
    },
  })

  if (!playlist) return <div>Ne postoji</div>

  return (
    <div>
      <h1>{playlist.name}</h1>

      {playlist.songs.map((s: any) => (
        <div key={s.id}>{s.song.title}</div>
      ))}
    </div>
  )
}