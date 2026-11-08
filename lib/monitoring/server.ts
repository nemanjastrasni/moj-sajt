import { unstable_cache } from "next/cache"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { ANNOTATION_TITLE, MAX_REPORT_BYTES, parsePublishedReport } from "@/scripts/lib/site-monitor-report.cjs"

export const MONITOR_REPOSITORY = "nemanjastrasni/moj-sajt"
export const MONITOR_WORKFLOW_URL = `https://github.com/${MONITOR_REPOSITORY}/actions/workflows/site-monitor.yml`
export type MonitorRun = { id: number; attempt: number; event: string; status: string; conclusion: string | null; startedAt: string; url: string }
export type MonitorHistory = { state: "ready" | "not-configured" | "unavailable"; checkedAt: string; runs: MonitorRun[] }
export type PublishedMonitorReport = {
  schemaVersion: 1; runId: string; attempt: number; origin: string; startedAt: string; finishedAt: string; status: "healthy" | "warning" | "critical";
  coverage: { sitemapFiles: number; sitemapUrls: number; songUrls: number; pagesChecked: number; requests: number; responseBytes: number };
  checks: { id: string; level: "info" | "warning" | "critical"; code: string; path: string; httpStatus?: number; observedCount?: number; reason?: "missing" | "multiple" | "mismatch" }[]; omittedChecks: number;
  ai: { status: string; httpStatus?: number; analysis?: { summary: string; findings: { checkId: string; explanation: string; recommendation: string; requiresApproval: true }[] } };
  databaseWrites: 0; sourceWrites: 0;
}
export type MonitorDetails = { state: "ready" | "not-published" | "unavailable"; report: PublishedMonitorReport | null; failedSteps: string[] }

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
      if (run.run_attempt !== undefined && (!Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 || run.run_attempt > 1000)) return { ...empty, state: "unavailable" }
      runs.push({ id: run.id, attempt: run.run_attempt ?? 1, event: run.event, status: run.status, conclusion: run.conclusion, startedAt: new Date(run.created_at).toISOString(), url: `https://github.com/${MONITOR_REPOSITORY}/actions/runs/${run.id}` })
    }
    return { ...empty, state: "ready", runs: runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  } catch { return { ...empty, state: "unavailable" } }
}

const cachedHistory = unstable_cache(() => fetchMonitorHistory(), ["admin-site-monitor-history-v1"], { revalidate: 300 })
export async function readMonitorHistory() {
  await requireSongAdmin()
  return cachedHistory()
}

// GitHub's public check annotations carry only our bounded, validated report.
// No artifact token, extra secret, database table or write permission is needed.
export async function fetchMonitorDetails(run: Pick<MonitorRun, "id" | "attempt">, fetcher: typeof fetch = fetch): Promise<MonitorDetails> {
  const empty: MonitorDetails = { state: "unavailable", report: null, failedSteps: [] }
  if (!Number.isSafeInteger(run.id) || run.id < 1 || !Number.isSafeInteger(run.attempt) || run.attempt < 1) return empty
  const base = `https://api.github.com/repos/${MONITOR_REPOSITORY}`
  let failedSteps: string[] = []
  const read = async (url: string) => {
    const response = await fetcher(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "GitarAkordiAdminMonitor" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw Error("unavailable")
    const body = await response.text()
    if (body.length > 500000) throw Error("oversized")
    return JSON.parse(body)
  }
  try {
    const jobs = await read(`${base}/actions/runs/${run.id}/attempts/${run.attempt}/jobs?per_page=10`)
    if (!Array.isArray(jobs.jobs)) return empty
    const job = jobs.jobs.slice(0,10).find((item: { name?: string }) => item.name === "inspect")
    if (!job) return { ...empty, state: "not-published" }
    failedSteps = Array.isArray(job.steps) ? job.steps.filter((step: { conclusion?: string; name?: string }) => step.conclusion === "failure" && typeof step.name === "string").slice(0,6).map((step: { name: string }) => step.name.slice(0,160)) : []
    const match = typeof job.check_run_url === "string" && new RegExp(`^https://api\\.github\\.com/repos/${MONITOR_REPOSITORY}/check-runs/(\\d{1,18})$`).exec(job.check_run_url)
    if (!match) return { ...empty, failedSteps }
    const annotations = await read(`${base}/check-runs/${match[1]}/annotations?per_page=100`)
    if (!Array.isArray(annotations)) return { ...empty, failedSteps }
    const candidates = annotations.slice(0,100).filter(item => item.title === ANNOTATION_TITLE && item.annotation_level === "notice" && item.path === ".github/workflows/site-monitor.yml")
    for (const item of candidates.reverse()) {
      if (typeof item.message !== "string" || Buffer.byteLength(item.message) > MAX_REPORT_BYTES) continue
      let report: PublishedMonitorReport | null = null
      try { report = parsePublishedReport(JSON.parse(item.message), run) as PublishedMonitorReport | null } catch { /* untrusted or partial annotation */ }
      if (report) return { state: "ready", report, failedSteps }
    }
    return { state: "not-published", report: null, failedSteps }
  } catch { return { ...empty, failedSteps } }
}
const cachedDetails = unstable_cache((id: number, attempt: number) => fetchMonitorDetails({ id, attempt }), ["admin-site-monitor-details-v1"], { revalidate: 300 })
export async function readMonitorDetails(run: MonitorRun) {
  await requireSongAdmin()
  return cachedDetails(run.id, run.attempt)
}

export function monitorScheduleNotice(history: MonitorHistory) {
  if (history.state === "not-configured") return "Nadzor još nije postavljen na GitHub. Potrebno je poslati pripremljene izmene."
  if (history.state === "unavailable") return "Istorija trenutno nije dostupna. Stanje nadzora nije potvrđeno; proveri GitHub Actions."
  if (!history.runs.length) return "Nema zabeleženih pokretanja. Pokreni prvu proveru na GitHub Actions stranici."
  const scheduled = history.runs.find(run => run.event === "schedule")
  if (!scheduled) return "Još nema dnevnog zakazanog pokretanja. Prati prvo jutarnje pokretanje na GitHub Actions."
  if (Date.parse(history.checkedAt) - Date.parse(scheduled.startedAt) > 36 * 60 * 60 * 1000) return "Dnevni nadzor kasni: nema zakazanog pokretanja duže od 36 sati. Proveri da li je raspored omogućen."
  if (scheduled.status !== "completed") return "Poslednja dnevna provera još nije završena."
  if (scheduled.conclusion !== "success") {
    const newer = history.runs.find(run => run.startedAt > scheduled.startedAt && run.status === "completed" && run.conclusion === "success")
    if (newer) return "Novije pokretanje je uspešno završeno. Prethodna dnevna provera nije uspešno završena; njene nalaze uporedi sa novijim izveštajem ispod."
    return "Poslednja dnevna provera nije uspešno završena. Otvori izveštaj i korake pokretanja."
  }
  return "Dnevna provera je završena. Upozorenja i AI predloge proveri u izveštaju; zeleno pokretanje ne znači da nema nalaza."
}
