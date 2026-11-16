type Text = { sr: string; en: string }
type PlaylistContent = { title: string; description: string; heading: Text; intro: Text }

const content: Record<string, PlaylistContent> = {
  beginner: {
    title: "Lake pesme za gitaru za početnike – Akordi i tekstovi",
    description: "Izbor lakih pesama za gitaru sa akordima i tekstovima. Pregledaj zapise ocenjene kao veoma laki ili laki i izaberi pesmu za vežbanje.",
    heading: { sr: "Lake pesme za gitaru za početnike", en: "Easy guitar songs for beginners" },
    intro: { sr: "Izbor zapisa ocenjenih kao veoma laki ili laki prema akordima. Otvori pesmu, proveri hvatove i vežbaj promene polako; ritam i tempo mogu biti zahtevniji od samih akorda.", en: "Charts rated very easy or easy based on their chords. Open a song, check its shapes and practise changes slowly; rhythm and tempo may be harder than the chords themselves." },
  },
  "4-akorda": {
    title: "Pesme sa do 4 akorda za gitaru – Akordi i tekstovi",
    description: "Pesme za gitaru sa najviše četiri različita akorda u dostupnom zapisu. Izaberi pesmu i proveri hvatove pre vežbanja.",
    heading: { sr: "Pesme sa do 4 akorda za gitaru", en: "Guitar songs with up to 4 chords" },
    intro: { sr: "Ovi zapisi imaju najviše četiri različita prepoznata akorda. Manji broj akorda ne znači uvek lakše sviranje: proveri da li među njima ima bare hvatova i koliko brzo se menjaju.", en: "These charts contain at most four distinct recognised chords. Fewer chords do not always mean easier playing: check for barre shapes and how quickly changes occur." },
  },
  acoustic: {
    title: "Pesme sa osnovnim otvorenim akordima za gitaru",
    description: "Izbor pesama čiji zapisi koriste osnovne otvorene akorde C, D, E, G, A, Am, Dm i Em. Pronađi akorde i tekst za vežbanje na gitari.",
    heading: { sr: "Pesme sa osnovnim otvorenim akordima", en: "Songs with basic open chords" },
    intro: { sr: "Izbor zapisa koji koriste samo akorde C, D, E, G, A, Am, Dm i Em. To ne znači da svaka pesma sadrži svih osam akorda. Proveri dijagrame i izdvoji dva hvata za vežbu promene.", en: "Charts using only C, D, E, G, A, Am, Dm and Em. This does not mean every song contains all eight chords. Check the diagrams and choose two shapes to practise changing between." },
  },
}

export function playlistCatalogContent(slug: string): PlaylistContent | null {
  return Object.hasOwn(content, slug) ? content[slug] : null
}

export function playlistCatalogMetadata(entry: { slug: string; title: string }, categoryLabel: string | null, page: number) {
  const copy = playlistCatalogContent(entry.slug)
  const label = entry.title + (categoryLabel ? " – " + categoryLabel : "")
  const title = (copy ? copy.title + (categoryLabel ? " – " + categoryLabel : "") : label + " – Pesme za gitaru") + (page > 1 ? " – Strana " + page : "")
  const description = copy ? copy.description + (categoryLabel ? ` Kategorija: ${categoryLabel}.` : "") + (page > 1 ? ` Strana ${page}.` : "") : `Izbor pesama za gitaru: ${label}. Akordi, tekstovi i procena težine sviranja.`
  return { title, description }
}
