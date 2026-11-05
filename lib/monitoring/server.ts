import { unstable_cache } from "next/cache"
import { requireSongAdmin } from "@/lib/adminSongs/server"

export const MONITOR_REPOSITORY = "nemanjastrasni/moj-sajt"
export const MONITOR_WORKFLOW_URL = `https://github.com/${MONITOR_REPOSITORY}/actions/workflows/site-monitor.yml`
type MonitorRun = { id: number; event: string; status: string; conclusion: string | null; startedAt: string; url: string }
export type MonitorHistory = { state: "ready" | "not-configured" | "unavailable"; checkedAt: string; runs: MonitorRun[] }

// Public workflow metadata only. No GitHub, OpenAI or database secret is needed here.
export async function fetchMonitorHistory(fetcher: typeof fetch = fetch, now = new Date()): Promise<MonitorHistory> {
  const empty = { checkedAt: now.toISOString(), runs: [] }
  try {
    const response = await fetcher(`https://api.github.com/repos/${MONITOR_REPOSITORY}/actions/workflows/site-monitor.yml/runs?per_page=30`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "GitarAkordiAdminMonitor" },
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
    })
    if (response.status === 404) return { ...empty, state: "not-configured" }
    if (!response.ok) return { ...empty, state: "unavailable" }
    const data = await response.json()
    if (!Array.isArray(data.workflow_runs)) return { ...empty, state: "unavailable" }
    const runs: MonitorRun[] = []
    for (const run of data.workflow_runs.slice(0, 30)) {
      if (run.head_branch !== "main" || !["schedule", "push", "workflow_dispatch"].includes(run.event)) continue
      if (!Number.isSafeInteger(run.id) || run.id <= 0 || !Number.isFinite(Date.parse(run.created_at)) || typeof run.status !== "string" || run.conclusion !== null && typeof run.conclusion !== "string") return { ...empty, state: "unavailable" }
      runs.push({ id: run.id, event: run.event, status: run.status, conclusion: run.conclusion, startedAt: new Date(run.created_at).toISOString(), url: `https://github.com/${MONITOR_REPOSITORY}/actions/runs/${run.id}` })
    }
    return { ...empty, state: "ready", runs: runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  } catch { return { ...empty, state: "unavailable" } }
}

const cachedHistory = unstable_cache(() => fetchMonitorHistory(), ["admin-site-monitor-history-v1"], { revalidate: 300 })
export async function readMonitorHistory() {
  await requireSongAdmin()
  return cachedHistory()
}

export function monitorScheduleNotice(history: MonitorHistory) {
  if (history.state === "not-configured") return "Nadzor još nije postavljen na GitHub. Potrebno je poslati pripremljene izmene."
  if (history.state === "unavailable") return "Istorija trenutno nije dostupna. Stanje nadzora nije potvrđeno; proveri GitHub Actions."
  if (!history.runs.length) return "Nema zabeleženih pokretanja. Pokreni prvu proveru na GitHub Actions stranici."
  const scheduled = history.runs.find(run => run.event === "schedule")
  if (!scheduled) return "Još nema dnevnog zakazanog pokretanja. Prati prvo jutarnje pokretanje na GitHub Actions."
  if (Date.parse(history.checkedAt) - Date.parse(scheduled.startedAt) > 36 * 60 * 60 * 1000) return "Dnevni nadzor kasni: nema zakazanog pokretanja duže od 36 sati. Proveri da li je raspored omogućen."
  if (scheduled.status !== "completed") return "Poslednja dnevna provera još nije završena."
  if (scheduled.conclusion !== "success") return "Poslednja dnevna provera nije uspešno završena. Otvori izveštaj i korake pokretanja."
  return "Dnevna provera je završena. Upozorenja i AI predloge proveri u izveštaju; zeleno pokretanje ne znači da nema nalaza."
}
