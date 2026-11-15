export function artistInitial(name: string) {
  const upper = name.trim().toUpperCase()
  return ["DŽ", "LJ", "NJ"].find(prefix => upper.startsWith(prefix)) ?? upper[0] ?? ""
}

export function artistCatalogLetter(name: string) {
  return /^[A-ZČĆŽŠĐ]/.test(name.trim().toUpperCase()) ? artistInitial(name) : "#"
}

type LetterArtist = { name: string; collaboration?: boolean }

export function artistCatalogLetters(artists: readonly LetterArtist[]) {
  return [...new Set(artists.filter(artist => !artist.collaboration).map(artist => artistCatalogLetter(artist.name)))].sort()
}

export function artistsForCatalogLetter<T extends LetterArtist>(artists: readonly T[], letter: string): T[] {
  return artists.filter(artist => !artist.collaboration && artistCatalogLetter(artist.name) === letter)
}
