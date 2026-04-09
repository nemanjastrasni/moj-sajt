import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ListeningPlaylistClient from "./client"

export default async function Page({ params }: any) {
  const { id } = params

  const playlist = await prisma.listeningPlaylist.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!playlist) return notFound()

  return <ListeningPlaylistClient playlist={playlist} />
}