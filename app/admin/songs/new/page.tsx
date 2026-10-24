import AdminSongForm from "../AdminSongForm"
import { requireSongAdmin } from "@/lib/adminSongs/server"

export default async function NewSongPage() {
  await requireSongAdmin()
  return <AdminSongForm />
}
