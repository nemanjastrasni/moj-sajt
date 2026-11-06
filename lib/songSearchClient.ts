import type { SongSearchResult } from "./songSearch"

export type SongSearchLoader = (query: string, signal: AbortSignal) => Promise<SongSearchResult[]>

function isSongResult(value: unknown): value is SongSearchResult {
  if (!value || typeof value !== "object") return false
  const song = value as Partial<SongSearchResult>
  return typeof song.id === "string" && typeof song.title === "string" &&
    typeof song.slug === "string" && typeof song.category === "string" &&
    typeof song.artist?.name === "string" && typeof song.artist?.slug === "string"
}

async function fetchSongSearch(query: string, signal: AbortSignal, fetcher: typeof fetch): Promise<SongSearchResult[]> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")
  signal.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(abort, 10000)
  try {
    const response = await fetcher(`/api/search?${new URLSearchParams({ q: query })}`, { signal: controller.signal })
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

// Short-lived, bounded, in-memory results for backspacing/repeating a query.
// Requests keep separate AbortControllers; cancellation never affects another search.
export function createSongSearchLoader(fetcher: typeof fetch = (input, init) => fetch(input, init), now = () => Date.now()): SongSearchLoader {
  const cache = new Map<string, { expires: number; songs: SongSearchResult[] }>()
  const copy = (songs: SongSearchResult[]) => songs.map(song => ({ ...song, artist: { ...song.artist } }))
  return async (query, signal) => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    const time = now()
    for (const [key, entry] of cache) if (entry.expires <= time) cache.delete(key)
    const hit = cache.get(query)
    if (hit) {
      cache.delete(query); cache.set(query, hit)
      return copy(hit.songs)
    }
    const songs = await fetchSongSearch(query, signal, fetcher)
    if (signal.aborted) throw new DOMException("Aborted", "AbortError")
    if (cache.size >= 20 && !cache.has(query)) cache.delete(cache.keys().next().value!)
    cache.set(query, { expires: now() + 15000, songs: copy(songs) })
    return songs
  }
}

export const loadSongSearch = createSongSearchLoader()
