type ArtistSection = "pesme" | "biografija"

function segments(pathname: string | null) {
  if (!pathname?.startsWith("/") || pathname.startsWith("//") || /[\\\u0000-\u0020?#]/.test(pathname)) return null
  try {
    const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent)
    return parts.some(part => /[/\\\u0000-\u001f]/.test(part) || part === "." || part === "..") ? null : parts
  } catch { return null }
}

const href = (parts: string[]) => "/" + parts.map(encodeURIComponent).join("/")

export function playlistReturnHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null
  if (value.includes("#")) return null
  const [path, query, extra] = value.split("?")
  if (extra !== undefined) return null
  const parts = segments(path)
  if (!parts || parts.some(part => !/^[a-z0-9_-]{1,128}$/i.test(part))) return null
  if (parts[0] === "plejliste" && (parts.length === 2 || parts.length === 3 && parts[1] === "kategorija")) {
    if (query === undefined) return href(parts)
    const params = new URLSearchParams(query), clean = new URLSearchParams()
    if (!query || [...params.keys()].some(key => !["page", "category"].includes(key) || params.getAll(key).length !== 1)) return null
    const page = params.get("page"), category = params.get("category")
    if (page !== null) { if (!/^[1-9]\d{0,5}$/.test(page)) return null; clean.set("page", page) }
    if (category !== null) { if (!["domace", "narodne", "strane"].includes(category)) return null; clean.set("category", category) }
    return href(parts) + "?" + clean.toString()
  }
  if (query !== undefined) return null
  if (parts[0] === "top-50" && parts.length === 2 && ["domace", "narodne", "strane"].includes(parts[1])) return href(parts)
  return null
}

export function playlistSongHref(song: { category: string; slug: string; artist: { slug: string } }, playlistPath: string) {
  const songPath = href(["pesme", song.category, song.artist.slug, song.slug])
  const returnTo = playlistReturnHref(playlistPath)
  return returnTo ? `${songPath}?playlist=${encodeURIComponent(returnTo)}` : songPath
}

export function artistIndexHref(section: ArtistSection, category: string, name: string) {
  const upper = name.trim().toUpperCase()
  // Biography indexes currently group digraphs under their first letter; song indexes do not.
  const digraph = section === "pesme" ? ["D\u017d", "LJ", "NJ"].find(letter => upper.startsWith(letter)) : undefined
  const letter = digraph ?? (/^[A-Z\u010c\u0106\u0110\u0160\u017d]/.test(upper) ? upper[0] : "num")
  return href([section, category, "slovo", letter.toLowerCase()])
}

export function parentHref(pathname: string | null): string | null {
  const parts = segments(pathname)
  if (!parts?.length) return null
  const [section, category, third] = parts
  if (section === "pesme" || section === "biografija") {
    if (parts.length === 1) return "/"
    if (parts.length === 2) return href([section])
    if (third === "slovo") return href([section, category])
    if (parts.length >= 4) return href([section, category, third])
    // A server-page hint supplies the actual artist name; never guess diacritics from a slug.
    return href([section, category])
  }
  if (section === "admin") {
    if (parts.length === 1) return "/"
    if (parts.length === 2) return "/admin"
    if (parts[4] === "merge" && parts[3] === "edit") return href(parts.slice(0, 4))
    return href(parts.slice(0, 2))
  }
  // These route families have category pages but no standalone index at their root.
  if (section === "top-50") return ["domace", "narodne", "strane"].includes(category) ? href(["pesme", category]) : "/pesme"
  if (section === "top-listening-playlists") return "/plejliste"
  if (section === "prijava-povrede") return "/kontakt"
  return parts.length === 1 ? "/" : href(parts.slice(0, -1))
}

export type ParentTarget = { pathname: string; href: string; owner: string }
export function activeParentHref(pathname: string | null, target: ParentTarget | null) {
  const fallback = parentHref(pathname)
  if (!fallback || !target || pathname !== target.pathname || target.href === pathname || !(segments(target.href) || playlistReturnHref(target.href))) return fallback
  return target.href
}
