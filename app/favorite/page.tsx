import { redirect } from "next/navigation"
import { playlistViewerId } from "@/lib/playlists/server"
import { omiljeneId } from "@/lib/playlists/omiljene"

export const dynamic = "force-dynamic"
export default async function FavoritePage() {
  const userId = await playlistViewerId()
  if (!userId) redirect("/login?callbackUrl=%2Ffavorite")
  const id = await omiljeneId(userId)
  redirect(id ? `/plejliste/${encodeURIComponent(id)}` : "/profile/plejliste")
}
