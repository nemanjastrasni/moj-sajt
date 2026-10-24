export type Album = { title: string; year: string; kind: string }

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
      if ("kind" in row && typeof row.kind === "string") kind = row.kind
    }
    const key = `${title.toLowerCase()}|${year}`
    if (title && title !== "[object Object]" && !seen.has(key)) { seen.add(key); result.push({ title, year, kind }) }
  }
  return result
}
