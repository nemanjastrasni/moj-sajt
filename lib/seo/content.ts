import { songContentKind } from "../adminStats/model"
import { biographyText } from "../biographies/catalog"
import { normalizeDiscography } from "../discography"

export function songMetadataText(song: { title: string; lyrics: string | null; artist: { name: string } }) {
  // SongClient renders lyrics. A legacy chords field that is not displayed must
  // not make the search snippet advertise chords that the visitor cannot see.
  const kind = songContentKind({ lyrics: song.lyrics, chords: null })
  const name = `${song.title} – ${song.artist.name}`
  if (kind === "withChords") return { title: `${name}: akordi i tekst`, description: `Akordi i tekst pesme ${name}. Promena tonaliteta, capo preporuke i prikaz za sviranje.`, index: true }
  if (kind === "notationOnly") return { title: `${name}: zapis za sviranje`, description: `Zapis pesme ${name}. Pregledaj dostupnu tabulaturu ili instrumentalne oznake i koristi prikaz za sviranje.`, index: true }
  if (kind === "textOnly") return { title: `${name}: tekst pesme`, description: `Tekst pesme ${name}. Pročitaj tekst i dodaj pesmu u svoj repertoar.`, index: true }
  return { title: `${name}: pesma`, description: `Stranica pesme ${name}. Zapis pesme trenutno nije dostupan.`, index: false }
}

export function biographyMetadataText(artist: { name: string; bio?: string | null; bioShort?: string | null; discography?: unknown }) {
  const bio = Boolean(biographyText(artist.bio) || biographyText(artist.bioShort))
  const albums = normalizeDiscography(artist.discography).length
  if (bio && albums) return { title: `${artist.name} – Biografija i diskografija`, description: `Biografija izvođača ${artist.name}, diskografija i pregled dostupnih albuma prema navedenim izvorima.` }
  if (bio) return { title: `${artist.name} – Biografija`, description: `Biografija izvođača ${artist.name}. Pročitaj podatke o izvođaču i pronađi njegove pesme.` }
  if (albums) return { title: `${artist.name} – Diskografija`, description: `Diskografija izvođača ${artist.name}. Pregled dostupnih albuma prema navedenim izvorima i veze ka pesmama.` }
  return { title: `${artist.name} – Profil izvođača`, description: `Profil izvođača ${artist.name}. Biografija i diskografija trenutno nisu dostupne.` }
}
