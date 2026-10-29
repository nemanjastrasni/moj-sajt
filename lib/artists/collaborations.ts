export type CollaborationArtist = { id: string; name: string; slug: string; category: string | null }
export const missingPerformerNames = [
  "Danijela Vrani\u0107", "Ivana Selakov", "Gabrijela Pej\u010dev", "Aleksandra Bursac", "Vanja Lakatos",
  "Emir \u0110ulovi\u0107", "Sanja Dole\u017eal", "Bora \u0110or\u0111evi\u0107", "Jelena Kostov", "Wikluh Sky",
  "Point blank", "Dragi Jelic", "Bojan Bjelic", "Aleksandar Domi\u0107", "Goran Trivi\u0107", "Toni Jankovic",
  "Zlatko Vuji\u0107", "Haris Berkovi\u0107", "Lady Gaga", "Bradley Cooper", "Luis Fonsi", "Daddy Yankee",
  "Nikola Pejakovi\u0107", "Milo\u0161 Brki\u0107", "Nikolina Pi\u0161ek", "Who See", "Sr\u0111an Gile Gojkovi\u0107",
  "Zorana Pavi\u0107", "\u0110or\u0111e Panti\u0107", "Zorica Kond\u017ea", "Tedi Spalato", "Denis Alilovi\u0107",
  "Warren G", "Nate Dogg",
]
export function artistNameKey(name: string) {
  return name.toLowerCase().replace(/\u0111/g, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
}

// These are artist/band names, not a list of independently credited guests.
const bands = new Set([
  "Denis & Denis", "Denis i Denis", "Leb i Sol", "Derek and the Dominos", "Emerson Lake & Palmer",
  "Nick Cave & The Bad Seeds", "Neil Young & Crazy Horse", "Emir i Frozen Camels",
  "Inspektor Blaza i Kljunovi", "Djura i Mornari", "Goran Bare i Placenici",
  "Kolja i grobovlasnici", "Kolja i Smak Bijelog Dugmeta", "Kiki Lesandric i Piloti",
  "Jura Stublic & Film", "Bilja Krstic i Bistrik", "Irina i Vi",
].map(artistNameKey))

export function collaborationParts(name: string): string[] | null {
  if (bands.has(artistNameKey(name))) return null
  const parts = name.split(/\s+(?:&|i|and|feat\.?|ft\.?|vs\.?|x|\+)\s+|\s*,\s*/i).map(part => part.trim())
  return parts.length >= 2 && parts.length <= 6 && parts.every(Boolean) ? parts : null
}

export function collaborationPlan(artists: CollaborationArtist[]) {
  const byName = new Map<string, CollaborationArtist[]>()
  for (const artist of artists) {
    const key = artistNameKey(artist.name)
    byName.set(key, [...byName.get(key) ?? [], artist])
  }
  const ready: { source: CollaborationArtist; performers: CollaborationArtist[] }[] = []
  const unresolved: { source: CollaborationArtist; parts: { name: string; candidates: CollaborationArtist[] }[] }[] = []
  for (const source of artists) {
    const names = collaborationParts(source.name)
    if (!names) continue
    const parts = names.map(name => {
      const candidates = (byName.get(artistNameKey(name)) ?? []).filter(artist => artist.id !== source.id && !collaborationParts(artist.name))
      const local = candidates.filter(artist => artist.category === source.category)
      return { name, candidates: local.length ? local : candidates }
    })
    const performers = parts.flatMap(part => part.candidates.length === 1 ? part.candidates : [])
    if (performers.length === names.length && new Set(performers.map(artist => artist.id)).size === performers.length) ready.push({ source, performers })
    else unresolved.push({ source, parts })
  }
  return { ready, unresolved }
}
