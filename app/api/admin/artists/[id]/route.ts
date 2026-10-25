import { NextResponse } from "next/server"
import { adminSongBody, adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { adminSongId } from "@/lib/adminSongs/validation"
import { validateArtistEdit, validateBioDelete } from "@/lib/adminContent/validation"
import { deleteArtistBiography, refreshArtistContent, updateArtistContent } from "@/lib/adminContent/server"
import { artistPageHref } from "@/lib/adminContent/paths"

type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await requireSongAdmin(), id = adminSongId((await params).id)
    const result = await updateArtistContent(id, actor.id, validateArtistEdit(await adminSongBody(request)))
    refreshArtistContent(result.before, result.artist)
    return NextResponse.json({ success: true, href: artistPageHref(result.artist), bioHref: artistPageHref(result.artist, "bio"), infoHref: artistPageHref(result.artist, "info") }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return adminSongFailure(error) }
}
// DELETE clears only biography text. It never deletes the artist or their songs.
export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await requireSongAdmin(), id = adminSongId((await params).id)
    const artist = await deleteArtistBiography(id, actor.id, validateBioDelete(await adminSongBody(request)))
    refreshArtistContent(artist)
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return adminSongFailure(error) }
}
