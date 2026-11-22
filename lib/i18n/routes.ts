import type { Locale } from "./index"

// Only pages with translated main content get an English address.
export const translatedRoutes = [
  { sr: "/", en: "/en" },
  { sr: "/o-nama", en: "/en/about" },
  { sr: "/akordi", en: "/en/guitar-chords" },
  { sr: "/vodici", en: "/en/guides" },
  { sr: "/vodici/kako-se-citaju-akordi-za-gitaru", en: "/en/guides/reading-guitar-chord-diagrams" },
  { sr: "/vodici/vezbanje-promene-akorda", en: "/en/guides/practising-chord-changes" },
  { sr: "/vodici/capo-i-promena-tonaliteta", en: "/en/guides/capo-and-transposition" },
  { sr: "/vodici/plejliste-za-gitaru-i-pdf-pesmarica", en: "/en/guides/guitar-playlists-and-pdf-songbooks" },
  { sr: "/vodici/youtube-muzika-i-muzicke-plejliste", en: "/en/guides/youtube-music-and-listening-playlists" },
] as const

const cleanPath = (path: string) => path.length > 1 ? path.replace(/\/$/, "") : path
export function translatedRoute(path: string) {
  const value = cleanPath(path.split(/[?#]/, 1)[0])
  return translatedRoutes.find(pair => pair.sr === value || pair.en === value)
}
export function routeLocale(path: string): Locale | null {
  const value = cleanPath(path), pair = translatedRoute(value)
  return pair ? pair.en === value ? "en" : "sr" : null
}
export function localizedHref(href: string, locale: Locale) {
  const pair = translatedRoute(href)
  return pair ? pair[locale] + href.slice(href.search(/[?#]/) < 0 ? href.length : href.search(/[?#]/)) : href
}
export const pathLocales = Object.fromEntries(translatedRoutes.flatMap(pair => [[pair.sr, "sr"], [pair.en, "en"]]))
