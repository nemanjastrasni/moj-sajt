import { redirect } from "next/navigation"
import { adminSongFilters, adminSongHref, type AdminSearchParams } from "@/lib/adminSongs/query"

export default async function LegacyAdminEdit({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const filters = adminSongFilters(await searchParams)
  redirect(adminSongHref(filters, filters.page))
}
