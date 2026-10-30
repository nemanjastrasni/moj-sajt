import { Prisma } from "@prisma/client"
import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "@/lib/submissions/validation"
import { playlistTransaction } from "./server"
import { activeSettingsOwner } from "./settingsServer"

export async function omiljeneId(userId: string) {
  const source = await prisma.favoritePlaylist.findUnique({ where: { userId }, select: { playlistId: true } })
  return source?.playlistId ?? null
}

export async function copyFavorites(tx: Prisma.TransactionClient, userId: string) {
  await activeSettingsOwner(tx, userId)
  const source = await tx.favoritePlaylist.findUnique({ where: { userId } })
  if (source?.playlistId) {
    const owned = await tx.playlist.findFirst({ where: { id: source.playlistId, userId }, select: { id: true } })
    if (!owned) throw new SubmissionError(409, "Playlista nije dostupna.")
    return owned
  }
  // A deleted destination is deliberate; never restore removed songs from the archive.
  const favorites = source ? [] : await tx.favorite.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, songId: true, transpose: true } })
  const playlist = await tx.playlist.create({ data: { userId, name: "Omiljene", category: "mix", isPublic: false,
    songs: { create: favorites.map((favorite, order) => ({ songId: favorite.songId, order, setting: { create: { userId, transpose: favorite.transpose, capo: null, version: 1 } } })) } }, select: { id: true } })
  if (source) await tx.favoritePlaylist.update({ where: { userId }, data: { playlistId: playlist.id } })
  else await tx.favoritePlaylist.create({ data: { userId, playlistId: playlist.id, sourceHash: createHash("sha256").update(JSON.stringify([...favorites].sort((a, b) => a.id.localeCompare(b.id)).map(row => [row.id, row.songId, row.transpose]))).digest("hex") } })
  return playlist
}
export async function createOmiljene(userId: string) {
  try { return await playlistTransaction(tx => copyFavorites(tx, userId)) }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return playlistTransaction(tx => copyFavorites(tx, userId))
    throw error
  }
}
