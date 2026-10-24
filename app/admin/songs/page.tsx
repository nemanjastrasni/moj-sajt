import AdminSongsList from "./AdminSongsList"
import { adminSongFilters, type AdminSearchParams } from "@/lib/adminSongs/query"
import { listAdminSongs, requireSongAdmin } from "@/lib/adminSongs/server"

export const dynamic = "force-dynamic"
export default async function AdminSongsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requireSongAdmin()
  const filters = adminSongFilters(await searchParams)
  return <AdminSongsList filters={filters} result={await listAdminSongs(filters)} />
}
