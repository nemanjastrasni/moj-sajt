export async function playlistRequest<T = { ok: boolean }>(url: string, method: string, body: unknown): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(body) })
    let data
    try { data = await response.json() } catch { throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.") }
    if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
    if (!data || typeof data !== "object") throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
    return data as T
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Zahtev traje predugo. Osvezi playlistu pre ponovnog pokusaja.")
    if (error instanceof TypeError) throw new Error("Promena nije uspela. Proveri internet vezu.")
    throw error
  } finally { clearTimeout(timer) }
}
import type { PdfSong } from "../songbook/model"


export async function playlistPdfSongs(id: string, songIds: string[]) {
  const data = await playlistRequest<{ name: string; songs: PdfSong[] }>(`/api/playlist/${encodeURIComponent(id)}/pdf`, "POST", { songIds })
  if (typeof data.name !== "string" || !Array.isArray(data.songs) || data.songs.length !== songIds.length || data.songs.some((song, index) => !song || song.id !== songIds[index] || song.transpose !== 0 || typeof song.title !== "string" || typeof song.artist !== "string" || typeof song.lyrics !== "string")) throw new Error("Spisak pesama nije ispravan. Osvezi playlistu.")
  return data
}
