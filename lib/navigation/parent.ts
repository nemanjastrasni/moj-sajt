type ArtistSection = "pesme" | "biografija"

function segments(pathname: string | null) {
  if (!pathname?.startsWith("/") || pathname.startsWith("//") || /[\\\u0000-\u0020?#]/.test(pathname)) return null
  try {
    const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent)
    return parts.some(part => /[/\\\u0000-\u001f]/.test(part) || part === "." || part === "..") ? null : parts
  } catch { return null }
}

const href = (parts: string[]) => "/" + parts.map(encodeURIComponent).join("/")

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
  if (!fallback || !target || pathname !== target.pathname || target.href === pathname || !segments(target.href)) return fallback
  return target.href
}
