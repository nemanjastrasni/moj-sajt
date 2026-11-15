type Text = { sr: string; en: string }
type CategoryContent = { title: string; description: string; heading: Text; intro: Text }
export const categoryContent: Record<string, CategoryContent> = {
  domace: {
    title: "Domaće i zabavne pesme – Akordi za gitaru i tekstovi",
    description: "Domaće i ex-Yu zabavne pesme za gitaru: pronađi izvođača, otvori akorde i tekst i sastavi repertoar za sviranje.",
    heading: { sr: "Domaće i zabavne pesme: akordi i tekstovi", en: "Domestic pop and rock songs: chords and lyrics" },
    intro: { sr: "Pregledaj domaće i ex-Yu zabavne, pop i rok izvođače. Izaberi početno slovo ili izvođača da otvoriš njegove pesme. Proveri konkretan zapis: uz akorde su dostupni i tekstovi i tabulature, zavisno od pesme.", en: "Browse domestic and ex-Yu pop and rock artists. Choose an initial or an artist to open their songs. Check each chart: available entries include chords, lyrics and tablature, depending on the song." },
  },
  narodne: {
    title: "Narodne pesme – Akordi za gitaru i tekstovi",
    description: "Narodne pesme za gitaru po izvođačima. Pronađi akorde i tekst, prilagodi tonalitet i sačuvaj pesme u svojoj plejlisti.",
    heading: { sr: "Narodne pesme: akordi za gitaru i tekstovi", en: "Folk songs: guitar chords and lyrics" },
    intro: { sr: "Pronađi narodne pesme preko imena pevača ili grupe. Na stranici izvođača izaberi pesmu i pogledaj dostupni zapis pre sviranja. Kada su akordi uneti, možeš prilagoditi tonalitet svom glasu i dodati pesmu u lični repertoar.", en: "Find folk songs by singer or band. On an artist's page, choose a song and inspect its available chart before playing. Where chords are provided, you can adapt the key to your voice and add the song to a personal repertoire." },
  },
  strane: {
    title: "Strane pesme – Akordi za gitaru, tekstovi i tabulature",
    description: "Strane pesme i bendovi: pregledaj akorde za gitaru, tekstove i dostupne tabulature. Izaberi izvođača i pesmu za svoj repertoar.",
    heading: { sr: "Strane pesme: akordi, tekstovi i tabulature", en: "International songs: chords, lyrics and tablature" },
    intro: { sr: "Pregledaj strane muzičare i bendove po početnom slovu. Otvori izvođača pa izaberi pesmu; naziv stranice označava da li zapis nudi akorde, tekst ili instrumentalne oznake. Za uvežbavanje izdvoji pesme u svoju plejlistu umesto da ih tražiš svaki put iznova.", en: "Browse international musicians and bands by their initials. Open an artist, then choose a song; the page title indicates whether the entry offers chords, lyrics or instrumental notation. Collect songs in a playlist for practice rather than searching for them again each time." },
  },
}
