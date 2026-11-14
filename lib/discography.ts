export type Album = { title: string; year: string; kind: string; publisher?: string; section?: string; group?: string }
export const albumGroups = [
  { kind: "studio", label: "Studijski albumi" },
  { kind: "live", label: "Koncertni albumi" },
  { kind: "compilation", label: "Kompilacije" },
  { kind: "single", label: "Singlovi" },
  { kind: "album", label: "Ostali albumi" },
] as const
const headingKey = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/^\s*#+\s*|[:：]\s*$/g, "").trim()
function heading(text: string): { kind: string; label?: string } | undefined {
  const key = headingKey(text)
  if (/^(?:albumi|studijski albumi|studijska izdanja|studio albums?|albums?)$/.test(key)) return { kind: "studio" }
  if (/^(?:live|live albumi|live albums?|koncertni albumi|albumi uzivo|koncertna izdanja)$/.test(key)) return { kind: "live" }
  if (/^(?:kompilacije|kompilacijski albumi|compilations?|compilation albums?)$/.test(key)) return { kind: "compilation" }
  if (/^(?:singlovi|singl[- ]ploce|singles?)$/.test(key)) return { kind: "single" }
  if (/^(?:mini[- ]albumi|ep izdanja)$/.test(key) || (key.match(/kompilacije|koncertni albumi|mini-albumi|singlovi/g)?.length ?? 0) > 1) return { kind: "album", label: text.trim().replace(/[:：]$/, "") }
}
const absent = /^(?:\[object Object\]|null|undefined|n\/?a|[-–—.]+|(?:diskografija|discography)(?:\s+(?:jo[sš]\s+)?nije dostupna|\s+is not available(?: yet)?)?[.!]?)$/i
function sourceRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []
  if (value.trim().startsWith("[")) {
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return value.split(/\r?\n/)
}
function release(text: string) {
  let title = text.trim(), year = "", publisher = ""
  const leading = title.match(/^((?:18|19|20)\d{2})(?:\s*[-–—:]\s*|\.\s+)/)
  if (leading) { year = leading[1]; title = title.slice(leading[0].length).trim() }
  const datedLabel = title.match(/\s+\(([^()]*)\)\s*$/)
  if (datedLabel) {
    const lastYear = datedLabel[1].match(/^(.+?)[,;]\s*((?:18|19|20)\d{2})\.?$/)
    const firstYear = datedLabel[1].match(/^((?:18|19|20)\d{2})[,;]\s*(.+)$/)
    const parsedYear = lastYear?.[2] || firstYear?.[1], label = lastYear?.[1] || firstYear?.[2]
    if (parsedYear && label && (!year || year === parsedYear)) { year = parsedYear; publisher = label.trim(); title = title.slice(0, datedLabel.index).trim() }
  }
  if (!year) {
    const trailing = title.match(/\s+(?:\(((?:18|19|20)\d{2})\)|[-–—]\s*((?:18|19|20)\d{2})\.?)\s*$/)
    if (trailing) { year = trailing[1] || trailing[2]; title = title.slice(0, trailing.index).trim() }
  }
  const label = title.match(/\s+\(([^()]+)\)\s*$/)
  if (year && !publisher && label && /(?:\bPGP\b|\bRT[B/S]\b|Jugoton|Diskoton|Diskos|Records|Music|Productions?|Produkcija|Croatia Records|Suzy|ZKP)/i.test(label[1])) {
    publisher = label[1].trim(); title = title.slice(0, label.index).trim()
  }
  return { title, year, publisher }
}

export function normalizeDiscography(value: unknown): Album[] {
  const rows = sourceRows(value), result: Album[] = [], seen = new Set<string>()
  let activeKind = "album", section = "", group = ""
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    let title = "", year = "", kind = activeKind, publisher = "", rowSection = section, rowGroup = group
    if (typeof row === "string") {
      const marker = heading(row)
      if (marker) { activeKind = marker.kind; group = marker.label ?? ""; continue }
      if (typeof rows[index + 1] === "string" && heading(rows[index + 1] as string) && !release(row).year && row.trim() && !absent.test(row.trim())) {
        section = row.trim().replace(/[:：]$/, ""); activeKind = "album"; group = ""; continue
      }
      ;({ title, year, publisher } = release(row))
    } else if (row && typeof row === "object" && "title" in row && typeof row.title === "string") {
      title = row.title.trim()
      if (heading(title) && !("year" in row && row.year)) continue
      if ("year" in row && /^(?:18|19|20)\d{2}$/.test(String(row.year))) year = String(row.year)
      if ("kind" in row && albumGroups.some(group => group.kind === row.kind)) kind = String(row.kind)
      for (const field of ["publisher", "label", "recordLabel"] as const) {
        const value = (row as Record<string, unknown>)[field]
        if (typeof value === "string" && value.trim()) { publisher = value.trim(); break }
      }
      if ("section" in row && typeof row.section === "string") rowSection = row.section.trim()
      if ("group" in row && typeof row.group === "string") rowGroup = row.group.trim()
      const parsed = release(title)
      if (!year || !parsed.year || year === parsed.year) { title = parsed.title; year ||= parsed.year; publisher ||= parsed.publisher }
    }
    if (year) title = title.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), "").trim()
    const key = JSON.stringify([rowSection, rowGroup, kind, title.toLowerCase(), year, publisher])
    if (title && !absent.test(title) && !seen.has(key)) {
      seen.add(key); result.push({ title, year, kind, ...(publisher ? { publisher } : {}), ...(rowSection ? { section: rowSection } : {}), ...(rowGroup ? { group: rowGroup } : {}) })
    }
  }
  return result
}

export function groupDiscography(value: unknown) {
  const groups = new Map<string, { key: string; kind: string; label: string; section?: string; albums: Album[] }>(), sections = new Map<string, number>()
  for (const album of normalizeDiscography(value)) {
    const section = album.section ?? "", label = album.group || albumGroups.find(group => group.kind === album.kind)!.label
    if (!sections.has(section)) sections.set(section, sections.size)
    const key = JSON.stringify([section, album.kind, label])
    if (!groups.has(key)) groups.set(key, { key, kind: album.kind, label, ...(section ? { section } : {}), albums: [] })
    groups.get(key)!.albums.push(album)
  }
  return [...groups.values()].sort((a, b) => sections.get(a.section ?? "")! - sections.get(b.section ?? "")! || albumGroups.findIndex(group => group.kind === a.kind) - albumGroups.findIndex(group => group.kind === b.kind))
    .map(group => ({ ...group, albums: group.albums.sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999") || a.title.localeCompare(b.title, "sr-Latn")) }))
}

export function discographyEditorText(value: unknown) {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value) && value.every(row => typeof row === "string")) return value.join("\n")
  return JSON.stringify(value, null, 2)
}
