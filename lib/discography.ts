export type Album = { title: string; year: string; kind: string }
export const albumGroups = [
  { kind: "studio", label: "Studijski albumi" },
  { kind: "live", label: "Koncertni albumi" },
  { kind: "compilation", label: "Kompilacije" },
  { kind: "album", label: "Ostali albumi" },
] as const

export function normalizeDiscography(value: unknown): Album[] {
  const rows: unknown[] = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : []
  const result: Album[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    let title = "", year = "", kind = "album"
    if (typeof row === "string") {
      year = row.match(/\b(?:19|20)\d{2}\b/)?.[0] || ""
      title = row.replace(/^\s*(?:19|20)\d{2}\.?\s*[-–—:]\s*/, "").replace(/\s*\((?:19|20)\d{2}\)\s*$/, "").trim()
    } else if (row && typeof row === "object" && "title" in row && typeof row.title === "string") {
      title = row.title.trim()
      if ("year" in row && /^(?:19|20)\d{2}$/.test(String(row.year))) year = String(row.year)
      if ("kind" in row && albumGroups.some(group => group.kind === row.kind)) kind = String(row.kind)
    }
    // Some legacy sources include the release year inside the displayed title too.
    if (year) title = title.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), "").trim()
    const key = `${title.toLowerCase()}|${year}`
    if (title && title !== "[object Object]" && !seen.has(key)) { seen.add(key); result.push({ title, year, kind }) }
  }
  return result
}

export function groupDiscography(value: unknown) {
  const albums = normalizeDiscography(value)
  return albumGroups.map(group => ({ ...group, albums: albums.filter(album => album.kind === group.kind)
    .sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999") || a.title.localeCompare(b.title, "sr-Latn")) }))
    .filter(group => group.albums.length > 0)
}
