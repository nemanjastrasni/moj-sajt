import { NextResponse } from "next/server"
import { adminSongBody, adminSongFailure, deleteAdminSong, refreshAdminSongs, requireSongAdmin, updateAdminSong } from "@/lib/adminSongs/server"
import { adminSongId, validateSongDelete, validateSongEdit } from "@/lib/adminSongs/validation"
import { artistPageHref, songPageHref } from "@/lib/adminContent/paths"

type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireSongAdmin()
    const id = adminSongId((await params).id)
    const { song, artist } = await updateAdminSong(id, validateSongEdit(await adminSongBody(request)))
    refreshAdminSongs()
    return NextResponse.json({ success: true, href: songPageHref(song, artist) })
  } catch (error) { return adminSongFailure(error) }
}
export const POST = PATCH

export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireSongAdmin()
    const id = adminSongId((await params).id)
    const song = await deleteAdminSong(id, validateSongDelete(await adminSongBody(request)))
    refreshAdminSongs()
    return NextResponse.json({ success: true, href: artistPageHref(song.artist) })
  } catch (error) { return adminSongFailure(error) }
}
