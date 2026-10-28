import { redirect } from "next/navigation"
import { listSongReports } from "@/lib/songReports/server"
import { reportFilters } from "@/lib/songReports/model"
import { SubmissionError } from "@/lib/submissions/validation"
import AdminSongReports from "@/app/components/AdminSongReports"
import UiText from "@/app/components/UiText"

export const dynamic = "force-dynamic"
export default async function SongReportsPage({ searchParams }: { searchParams: Promise<{ status?: string | string[]; kind?: string | string[]; page?: string | string[] }> }) {
  const filters = reportFilters(await searchParams)
  let data
  try { data = await listSongReports(filters) }
  catch (error) {
    if (error instanceof SubmissionError && error.status === 401) redirect("/login?callbackUrl=%2Fadmin%2Fprijave")
    if (error instanceof SubmissionError && error.status === 403) redirect("/")
    return <p role="alert" className="text-red-700"><UiText text="Prijave trenutno nisu dostupne. Pokusaj kasnije." /></p>
  }
  return <AdminSongReports data={data} filters={filters} />
}
