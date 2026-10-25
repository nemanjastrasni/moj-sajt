import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { adminSongBody, adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { adminSongId } from "@/lib/adminSongs/validation"
import { validateUserRole } from "@/lib/adminContent/validation"
import { updateUserRole } from "@/lib/adminContent/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSongAdmin(), id = adminSongId((await params).id)
    const user = await updateUserRole(id, actor.id, validateUserRole(await adminSongBody(request)))
    try { revalidatePath("/admin/korisnici") } catch {}
    return NextResponse.json({ success: true, user }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return adminSongFailure(error) }
}
