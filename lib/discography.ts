export type Album = { title: string; year: string; kind: string; publisher?: string; note?: string; years?: string[]; section?: string; group?: string }
export const albumGroups = [
  { kind: "studio", label: "Studijski albumi" },
  { kind: "live", label: "Koncertni albumi" },
  { kind: "compilation", label: "Kompilacije" },
  { kind: "single", label: "Singlovi" },
  { kind: "album", label: "Ostali albumi" },
] as const
const headingKey = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/^\s*#+\s*|[:：]\s*$/g, "").trim()
function simpleHeading(key: string): string | undefined {
  if (/^(?:albumi|studijski albumi|studijska izdanja|studio albums?|albums?)$/.test(key)) return "studio"
  if (/^(?:live|live albumi|live albums?|uzivo|uzivo albumi|koncertni albumi|albumi uzivo|koncertna izdanja)$/.test(key)) return "live"
  if (/^(?:kompilacije|kompilacijski albumi|compilations?|compilation albums?)$/.test(key)) return "compilation"
  if (/^(?:singlovi|singl[- ]ploce|singles?)$/.test(key)) return "single"
  if (/^(?:mini[- ]albumi|ep izdanja)$/.test(key)) return "album"
}
function heading(text: string): { kind: string; label?: string } | undefined {
  const key = headingKey(text), kind = simpleHeading(key), label = text.trim().replace(/[:：]$/, "")
  if (kind) return { kind, ...(kind === "album" ? { label } : {}) }
  if (/^(?:nezvanicno|nezvanicna izdanja|nezvanicni albumi|bootlegs?|bootleg albums?|unofficial releases?)$/.test(key)) return { kind: "album", label }
  const parts = key.split(/\s*(?:[,;/&]|\bi\b|\band\b)\s*/).filter(Boolean)
  if (parts.length > 1 && parts.every(part => simpleHeading(part))) return { kind: "album", label }
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
const publisherHint = /(?:\bPGP\b|\bRTV?\b|\bRT[B/S]\b|Jugoton|Diskoton|Diskos|Records?|Music|Productions?|Produkcija|Croatia Records|Suzy|ZKP|Bellaphon|Sorabia disk)/i
const formatHint = /(?:\b(?:CD|LP|DVD|EP|vinyl|cassette|live|bootlegs?)\b|kaset|kazet|ploc|ploč|kompilaci|koncert|uzivo|uživo|dupl|maksi|singl|izdanj|remaster|nezvanic|nezvanič)/i
const yearMatches = (value: string) => [...value.matchAll(/\b(?:18|19|20)\d{2}\b/g)]
const cleanDetail = (value: string) => value.replace(/^[\s,;:.–—-]+|[\s,;:.–—-]+$/g, "")

function datedDetails(value: string) {
  const matches = yearMatches(value), years = [...new Set(matches.map(match => match[0]))]
  // Date ranges and explicitly recorded/remastered dates do not establish a release year.
  if (!years.length || /\b(?:18|19|20)\d{2}\s*[-–—/]\s*(?:18|19|20)\d{2}\b/.test(value) || /(?:\brecorded\b|\bremaster(?:ed)?\b|snimljen|snimljeno)/i.test(value)) return null
  const publishers: string[] = [], notes: string[] = []
  for (const part of value.split(/[,;]/).map(part => part.trim()).filter(Boolean)) {
    const dates = yearMatches(part), first = dates[0]
    const before = first ? cleanDetail(part.slice(0, first.index)) : part
    const after = first ? cleanDetail(part.slice(first.index! + first[0].length)) : ""
    const candidate = before || after
    const isPublisher = candidate && (!formatHint.test(candidate) || publisherHint.test(candidate))
    let remaining = part
    if (isPublisher) { publishers.push(candidate); remaining = cleanDetail(part.replace(candidate, "")) }
    const withoutYears = cleanDetail(remaining.replace(/\b(?:18|19|20)\d{2}\b\.?/g, ""))
    if (withoutYears) notes.push(years.length > 1 ? cleanDetail(remaining) : withoutYears)
  }
  return { year: years[0], years, publisher: publishers.join(", "), note: notes.join(", ") }
}
function release(text: string) {
  let title = text.trim(), year = "", publisher = "", note = "", years: string[] = []
  const leading = title.match(/^((?:18|19|20)\d{2})(?:\s*[-–—:]\s*|\.\s+)/)
  if (leading) { year = leading[1]; title = title.slice(leading[0].length).trim() }
  const datedLabel = title.match(/\s+\(([^()]*)\)\s*$/)
  if (datedLabel) {
    const details = datedDetails(datedLabel[1])
    if (details && (!year || details.years.length === 1 && year === details.year)) {
      ;({ year, years, publisher, note } = details)
      title = title.slice(0, datedLabel.index).trim()
    }
  }
  if (!year) {
    const trailing = title.match(/\s+(?:\(((?:18|19|20)\d{2})\)|[-–—]\s*((?:18|19|20)\d{2})\.?)\s*$/)
    if (trailing) { year = trailing[1] || trailing[2]; title = title.slice(0, trailing.index).trim() }
  }
  const label = title.match(/\s+\(([^()]+)\)\s*$/)
  if (year && !publisher && label && publisherHint.test(label[1])) {
    publisher = label[1].trim(); title = title.slice(0, label.index).trim()
  }
  return { title, year, publisher, note, years }
}

export function normalizeDiscography(value: unknown): Album[] {
  const rows = sourceRows(value), result: Album[] = [], seen = new Set<string>()
  let activeKind = "album", section = "", group = ""
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    let title = "", year = "", kind = activeKind, publisher = "", note = "", years: string[] = [], rowSection = section, rowGroup = group
    if (typeof row === "string") {
      const marker = heading(row)
      if (marker) { activeKind = marker.kind; group = marker.label ?? ""; continue }
      if (typeof rows[index + 1] === "string" && heading(rows[index + 1] as string) && !release(row).year && row.trim() && !absent.test(row.trim())) {
        section = row.trim().replace(/[:：]$/, ""); activeKind = "album"; group = ""; continue
      }
      ;({ title, year, publisher, note, years } = release(row))
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
      if ("note" in row && typeof row.note === "string") note = row.note.trim()
      if ("years" in row && Array.isArray(row.years)) years = [...new Set(row.years.map(String).filter(value => /^(?:18|19|20)\d{2}$/.test(value)))]
      const parsed = release(title)
      if (!year || !parsed.year || year === parsed.year) { title = parsed.title; year ||= parsed.year; publisher ||= parsed.publisher; note ||= parsed.note; if (!years.length) years = parsed.years }
      if (!year && years.length) year = years[0]
    }
    if (year) title = title.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), "").trim()
    const key = JSON.stringify([rowSection, rowGroup, kind, title.toLowerCase(), year, publisher, note, years.length > 1 ? years : []])
    if (title && !absent.test(title) && !seen.has(key)) {
      seen.add(key); result.push({ title, year, kind, ...(publisher ? { publisher } : {}), ...(note ? { note } : {}), ...(years.length > 1 ? { years } : {}), ...(rowSection ? { section: rowSection } : {}), ...(rowGroup ? { group: rowGroup } : {}) })
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
