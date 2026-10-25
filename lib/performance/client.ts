import { isPerformanceSnapshot } from "./model"
export class PerformanceError extends Error { constructor(message: string, public status = 0) { super(message) } }
export async function loadPerformance(id: string, songId: string | undefined, signal: AbortSignal) {
  const controller = new AbortController(), abort = () => controller.abort()
  signal.addEventListener("abort", abort, { once: true })
  if (signal.aborted) controller.abort()
  const timer = setTimeout(abort, 15000)
  try {
    const response = await fetch(`/api/playlist/${encodeURIComponent(id)}/play${songId ? "?songId=" + encodeURIComponent(songId) : ""}`, { cache: "no-store", signal: controller.signal })
    const raw = await response.text()
    if (raw.length > 2000000) throw new PerformanceError("Playlista je prevelika za rezim sviranja.")
    let data
    try { data = JSON.parse(raw) } catch { throw new PerformanceError("Rezim sviranja trenutno nije dostupan.", response.status) }
    if (!response.ok) throw new PerformanceError(typeof data?.error === "string" ? data.error : "Rezim sviranja trenutno nije dostupan.", response.status)
    if (!isPerformanceSnapshot(data) || data.id !== id || songId && data.current.id !== songId) throw new PerformanceError("Podaci playliste nisu ispravni. Osvezi prikaz.")
    return data
  } catch (cause) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (cause instanceof PerformanceError) throw cause
    throw new PerformanceError("Rezim sviranja trenutno nije dostupan.")
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort) }
}
