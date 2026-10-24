import type { PdfFonts, PdfOptions } from "./pdf"
import type { BookEntry, PdfSong } from "./model"
import { slugify } from "../until/slug"

let fontCache: Promise<PdfFonts> | null = null
async function loadFonts(): Promise<PdfFonts> {
  if (!fontCache) fontCache = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000)
    try {
      const bytes = async (name: string) => {
        const response = await fetch("/fonts/songbook/" + name, { signal: controller.signal })
        if (!response.ok || Number(response.headers.get("content-length")) > 1000000) throw new Error("PDF fontovi nisu ucitani. Pokusaj ponovo.")
        const data = new Uint8Array(await response.arrayBuffer())
        if (data.length < 1000 || data.length > 1000000 || new DataView(data.buffer).getUint32(0) !== 0x00010000) throw new Error("PDF fontovi nisu ucitani. Pokusaj ponovo.")
        return data
      }
      const [regular, bold] = await Promise.all([bytes("DejaVuSansMono.ttf"), bytes("DejaVuSansMono-Bold.ttf")])
      return { regular, bold }
    } finally { clearTimeout(timer) }
  })().catch(error => { fontCache = null; throw error })
  return fontCache
}

export async function favoritePdfSongs(entries: BookEntry[]): Promise<PdfSong[]> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch("/api/songbook", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ songs: entries }) })
    let data
    try { data = await response.json() } catch { throw new Error("PDF nije napravljen. Pokusaj ponovo.") }
    if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "PDF nije napravljen. Pokusaj ponovo.")
    if (!Array.isArray(data.songs) || data.songs.length !== entries.length || data.songs.some((song: PdfSong, index: number) => !song || song.id !== entries[index].id || song.transpose !== entries[index].transpose || typeof song.lyrics !== "string" || typeof song.title !== "string" || typeof song.artist !== "string")) throw new Error("Spisak pesama nije ispravan. Osvezi favorite.")
    return data.songs
  } finally { clearTimeout(timer) }
}

export async function preparePdfDownload(songs: PdfSong[], options: PdfOptions, progress?: (done: number) => void) {
  const [{ generateSongbookPdf }, fonts] = await Promise.all([import("./pdf"), loadFonts()])
  const result = await generateSongbookPdf(songs, options, fonts, progress)
  const blob = new Blob([new Uint8Array(result.bytes).buffer], { type: "application/pdf" })
  return { url: URL.createObjectURL(blob), filename: (slugify(options.title).replace(/-+/g, "-").slice(0, 100) || "pesmarica") + ".pdf", pages: result.pageCount }
}
export function downloadPdf(file: { url: string; filename: string }) {
  const link = document.createElement("a")
  link.href = file.url; link.download = file.filename; link.rel = "noopener"; link.style.display = "none"
  document.body.append(link); link.click(); link.remove()
}
export function pdfError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "PDF priprema traje predugo. Pokusaj ponovo."
  if (error instanceof TypeError) return "PDF nije napravljen. Proveri internet vezu i pokusaj ponovo."
  return error instanceof Error ? error.message : "PDF nije napravljen. Pokusaj ponovo."
}
