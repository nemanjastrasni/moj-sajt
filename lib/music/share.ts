import { canonicalYoutube, externalMusicUrl, youtubeSource, type MusicList } from "./model"

type ShareList = Pick<MusicList, "name" | "items">
const line = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim()

export function musicItemShareUrl(url: string) {
  const source = youtubeSource(url)
  return source ? canonicalYoutube(source) : externalMusicUrl(url)
}

// Comment lines keep the shared text readable and compatible with the MP3 app:
// it ignores lines starting with # and imports every following URL in order.
export function musicShareText(list: ShareList): string {
  return ["# " + line(list.name), ...list.items.flatMap((item, index) => ["", `# ${index + 1}. ${line(item.title || item.youtubeTitle || "YouTube")}`, line(item.url)])].join("\n")
}

export function musicShareExport(list: ShareList): string {
  return JSON.stringify({ schema: "gitarakordi-mp3-v1", playlist: { name: list.name, items: list.items.map(item => ({ title: item.title, url: item.url })) } }, null, 2)
}

export function musicShareFilename(name: string): string {
  const clean = name.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_").trim().slice(0, 90).replace(/[ .]+$/, "") || "Moja muzika"
  const safe = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(clean) ? "_" + clean : clean
  return safe + ".gitarakordi.json"
}

export async function copyMusicText(text: string, clipboard?: Pick<Clipboard, "writeText">): Promise<boolean> {
  if (!clipboard?.writeText) return false
  try { await clipboard.writeText(text); return true } catch { return false }
}

export function shareCancelled(error: unknown): boolean {
  return !!error && typeof error === "object" && "name" in error && error.name === "AbortError"
}
