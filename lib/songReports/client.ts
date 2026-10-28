import { isReportStatus, reportId } from "./model"

export class ReportRequestError extends Error { constructor(message: string, public status = 0) { super(message) } }
export async function reportRequest(url: string, method: "POST" | "PATCH", body: unknown, signal?: AbortSignal): Promise<{ id: string; status: string }> {
  const controller = new AbortController(), abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timer = setTimeout(abort, 15000)
  try {
    const response = await fetch(url, { method, credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    let data
    try { data = await response.json() } catch { throw new ReportRequestError("Odgovor prijave nije ispravan. Osvezi prikaz.", response.status) }
    if (!response.ok) throw new ReportRequestError(typeof data?.error === "string" ? data.error : "Prijave trenutno nisu dostupne. Pokusaj kasnije.", response.status)
    if (!data || !reportId(data.id) || !isReportStatus(data.status) || method === "POST" && data.status !== "pending") throw new ReportRequestError("Odgovor prijave nije ispravan. Osvezi prikaz.")
    return { id: data.id, status: data.status }
  } catch (cause) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    if (controller.signal.aborted) throw new ReportRequestError("Zahtev traje predugo. Prijava je mozda sacuvana; proveri pre ponovnog slanja.")
    if (cause instanceof ReportRequestError) throw cause
    throw new ReportRequestError("Slanje nije uspelo. Proveri internet vezu.")
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort) }
}
