import type { SongSearchResult } from "./songSearch"

export type SongSearchLoader = (query: string, signal: AbortSignal) => Promise<SongSearchResult[]>

function isSongResult(value: unknown): value is SongSearchResult {
  if (!value || typeof value !== "object") return false
  const song = value as Partial<SongSearchResult>
  return typeof song.id === "string" && typeof song.title === "string" &&
    typeof song.slug === "string" && typeof song.category === "string" &&
    typeof song.artist?.name === "string" && typeof song.artist?.slug === "string"
}

export const loadSongSearch: SongSearchLoader = async (query, signal) => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")
  signal.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(abort, 10000)
  try {
    const response = await fetch(`/api/search?${new URLSearchParams({ q: query })}`, { signal: controller.signal })
    if (!response.ok) throw new Error("Pretraga trenutno nije dostupna. Pokusaj ponovo.")
    const data: unknown = await response.json()
    if (!Array.isArray(data) || !data.every(isSongResult)) throw new Error("Pretraga trenutno nije dostupna. Pokusaj ponovo.")
    return data
  } catch (error) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (controller.signal.aborted) throw new Error("Pretraga traje predugo. Pokusaj ponovo.")
    if (error instanceof Error && error.message.startsWith("Pretraga")) throw error
    throw new Error("Pretraga nije uspela. Proveri vezu i pokusaj ponovo.")
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", abort)
  }
}
