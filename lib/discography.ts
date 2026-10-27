export type Album = { title: string; year: string; kind: string }
export const albumGroups = [
  { kind: "studio", label: "Studijski albumi" },
  { kind: "live", label: "Koncertni albumi" },
  { kind: "compilation", label: "Kompilacije" },
  { kind: "album", label: "Ostali albumi" },
] as const

export function normalizeDiscography(value: unknown): Album[] {
  let rows: unknown[] = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : []
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try { const parsed: unknown = JSON.parse(value); rows = Array.isArray(parsed) ? parsed : [] } catch { rows = [] }
  }
  const result: Album[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    let title = "", year = "", kind = "album"
    if (typeof row === "string") {
      const leading = row.match(/^\s*((?:19|20)\d{2})(?:\s*[-–—:]\s*|\.\s+)/)
      const trailing = row.match(/\s+(?:\(((?:19|20)\d{2})\)|[-–—]\s*((?:19|20)\d{2})\.?)\s*$/)
      year = leading?.[1] || trailing?.[1] || trailing?.[2] || ""
      title = row.slice(leading?.[0].length || 0, trailing?.index ?? row.length).trim()
    } else if (row && typeof row === "object" && "title" in row && typeof row.title === "string") {
      title = row.title.trim()
      if ("year" in row && /^(?:19|20)\d{2}$/.test(String(row.year))) year = String(row.year)
      if ("kind" in row && albumGroups.some(group => group.kind === row.kind)) kind = String(row.kind)
    }
    // Some legacy sources include the release year inside the displayed title too.
    if (year) title = title.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), "").trim()
    const key = `${title.toLowerCase()}|${year}`
    if (title && !/^(?:\[object Object\]|null|undefined|n\/?a|[-–—.]+|(?:diskografija|discography)(?:\s+(?:jo[sš]\s+)?nije dostupna|\s+is not available(?: yet)?)?[.!]?)$/i.test(title) && !seen.has(key)) {
      seen.add(key); result.push({ title, year, kind })
    }
  }
  return result
}

export function groupDiscography(value: unknown) {
  const albums = normalizeDiscography(value)
  return albumGroups.map(group => ({ ...group, albums: albums.filter(album => album.kind === group.kind)
    .sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999") || a.title.localeCompare(b.title, "sr-Latn")) }))
    .filter(group => group.albums.length > 0)
}
