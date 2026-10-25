import { redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
export const dynamic = "force-dynamic"
export default async function OnlinePage() {
  await requireSongAdmin()
  redirect("/admin/korisnici#online")
}
