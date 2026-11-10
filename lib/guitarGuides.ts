export type GuideText = { sr: string; en: string }
export type GuideSection = { id: string; heading: GuideText; paragraphs: GuideText[]; steps?: GuideText[]; example?: "diagrams" | "practice" | "capo" }
export type GuitarGuide = { slug: string; title: GuideText; description: GuideText; sections: GuideSection[]; links: { href: string; label: GuideText }[]; source: { href: string; title: string } }
const text = (sr: string, en: string): GuideText => ({ sr, en })

export const guitarGuides: GuitarGuide[] = [
  {
    slug: "kako-se-citaju-akordi-za-gitaru",
    title: text("Kako se čitaju akordi i dijagrami za gitaru", "How to read guitar chords and diagrams"),
    description: text("Pročitaj dijagram korak po korak: šest žica, pragovi, oznake X i 0 i primeri hvatova Em i Am.", "Read a chord diagram step by step: six strings, frets, X and 0 markings, and Em and Am examples."),
    sections: [
      { id: "naziv", heading: text("Naziv akorda i hvat nisu isto", "A chord name and a chord shape are different"), paragraphs: [
        text("Em je oznaka za e-mol, a Am za a-mol. Slovo označava osnovni ton, dok m označava molski akord. C bez dodatka označava C-dur. Brojevi i druge oznake, kao 7 ili sus4, menjaju sastav akorda: ne preskači ih pri čitanju.", "Em means E minor and Am means A minor. The letter identifies the root, while m identifies a minor chord. C on its own means C major. Numbers and other markings, such as 7 or sus4, change the chord's notes: do not ignore them."),
        text("Isti akord možeš odsvirati na više mesta na vratu. Dijagram prikazuje jedan konkretan raspored prstiju, a ne jedini mogući način sviranja tog akorda.", "You can play the same chord in several positions on the neck. A diagram shows one particular fingering, rather than the only possible way to play that chord.")
      ] },
      { id: "mreza", heading: text("Šest uspravnih linija predstavlja šest žica", "Six vertical lines represent six strings"), paragraphs: [
        text("Na uspravnim dijagramima ispod, leva linija je šesta, najdeblja žica, a desna prva, najtanja. Brojevi 6–1 ispod mreže označavaju žice. Vodoravne linije su pragovi; prostor između njih je mesto na koje pritiskaš žicu.", "In the upright diagrams below, the left line is string 6, the thickest string, and the right line is string 1, the thinnest. Numbers 6–1 below the grid identify strings. Horizontal lines are frets; press the string in the space between them."),
        text("Deblja gornja linija na ovim primerima predstavlja gornju kobilicu (nut) na početku vrata. Ako drugi dijagram ima oznaku početnog praga, recimo 5, prikaz počinje od tog praga umesto od prvog. Nemoj pretpostaviti da svaka mreža počinje na prvom pragu.", "The thick top line in these examples represents the nut at the top of the neck. If another diagram labels its starting fret, for example 5, the diagram starts there rather than at fret 1. Do not assume that every grid begins at the first fret.")
      ] },
      { id: "oznake", heading: text("X, 0 i tačke: šta sviraš, a šta izostavljaš", "X, 0 and dots: what to play and what to leave out"), paragraphs: [
        text("X iznad žice znači da je izostaviš ili prigušiš. Oznaka 0 (ili krug O) znači praznu žicu: sviraš je bez pritiskanja. Tačka znači da tu žicu pritisneš na prikazanom pragu. Broj uz tačku, kada postoji, može označavati prst: 1 kažiprst, 2 srednji, 3 domali i 4 mali.", "X above a string means leave it out or mute it. A 0 (or a circle O) means an open string: play it without fretting. A dot means fret that string at the position shown. A number at a dot, when provided, may identify a finger: 1 index, 2 middle, 3 ring and 4 little finger."),
        text("Neki zapisi koriste B, a drugi H za ton koji se u engleskom sistemu zove B. U nemačkom sistemu B označava B♭. Kada kombinuješ zapise iz različitih izvora, proveri koji sistem koriste.", "Some charts use B and others H for the note called B in English notation. In German notation, B means B-flat. When combining charts from different sources, check which notation system they use.")
      ], example: "diagrams" },
      { id: "probaj", heading: text("Pročitaj, postavi hvat, pa proveri svaku žicu", "Read the diagram, form the shape, then check each string"), paragraphs: [
        text("Za Em pritisni petu i četvrtu žicu na drugom pragu. Ostale su prazne i sviraš svih šest. Za Am izostavi šestu žicu; peta je prazna, četvrta i treća su na drugom pragu, druga na prvom, a prva je prazna.", "For Em, fret strings 5 and 4 at fret 2. The other strings are open, and you play all six. For Am, leave out string 6; string 5 is open, strings 4 and 3 are at fret 2, string 2 is at fret 1, and string 1 is open.")
      ], steps: [
        text("Postavi prste blizu metalnog praga, sa strane prema glavi gitare, umesto direktno na metal.", "Place your fingers close behind the fret wire, on its headstock side, rather than directly on the metal."),
        text("Odsviraj žice pojedinačno. Ako neka ne zvoni, proveri da li je dodiruje susedni prst i da li je pritisak dovoljan.", "Pick the strings one at a time. If one does not ring, check whether a neighbouring finger touches it and whether you are pressing firmly enough."),
        text("Tek kada se potrebne žice čuju, odsviraj ceo akord i pređi na vežbu promene hvatova.", "Once the required strings ring clearly, strum the whole chord and move on to practising chord changes.")
      ] }
    ],
    links: [{ href: "/akordi/E", label: text("Dijagrami akorda sa osnovnim tonom E", "Chord diagrams rooted on E") }, { href: "/akordi/A", label: text("Dijagrami akorda sa osnovnim tonom A", "Chord diagrams rooted on A") }],
    source: { href: "https://www.fender.com/articles/chords/read-guitar-chord-charts", title: "Fender: How to Read Guitar Chord Charts" }
  },
  {
    slug: "vezbanje-promene-akorda",
    title: text("Kako vežbati promene akorda: Em i Am", "How to practise chord changes: Em and Am"),
    description: text("Kratka vežba prelaska između Em i Am: jasne žice, mali pokreti i ravnomeran puls pre povećavanja brzine.", "A short Em-to-Am practice routine: clear strings, small movements and a steady pulse before increasing speed."),
    sections: [
      { id: "priprema", heading: text("Prvo proveri oba hvata odvojeno", "Check each chord shape separately first"), paragraphs: [
        text("Pre nego što meriš brzinu promene, odsviraj Em i Am žicu po žicu. Brzo postavljen hvat sa prigušenom važnom žicom još nije čista promena. Dijagrami pokazuju položaje žica; predlog prstiju u nastavku je jedna praktična mogućnost.", "Before timing your changes, play Em and Am one string at a time. A quickly formed shape with an important muted string is not yet a clean change. The diagrams show string positions; the fingering below is one practical option."),
        text("Za ovu vežbu na Em koristi srednji prst na petoj žici i domali na četvrtoj, oba na drugom pragu. Na Am srednji ide na četvrtu, domali na treću žicu drugog praga, a kažiprst na drugu žicu prvog praga. Na Am počni trzaj od pete žice.", "For this exercise, play Em with your middle finger on string 5 and ring finger on string 4, both at fret 2. For Am, move the middle finger to string 4 and the ring finger to string 3 at fret 2, and add the index finger on string 2 at fret 1. Strum Am from string 5.")
      ], example: "diagrams" },
      { id: "pokret", heading: text("Uvežbaj putanju prstiju bez žurbe", "Practise the finger movements without rushing"), paragraphs: [
        text("Polako pređi iz Em u Am, pa nazad. Srednji i domali prst pomeraju se za jednu žicu, dok kažiprst dodaješ ili sklanjaš. Drži prste blizu vrata i pokušaj da ih postaviš zajedno. U ovom predlogu nema prsta koji mora stalno da ostane pritisnut na istoj žici.", "Move slowly from Em to Am and back. The middle and ring fingers each move by one string while the index finger is added or removed. Keep your fingers close to the neck and aim to place them together. With this fingering, no finger needs to stay pressed on the same string throughout."),
        text("Ako jedan smer ide lakše, posveti više ponavljanja težem povratku. Cilj nije određen broj promena, nego da unapred znaš gde svaki prst ide.", "If one direction feels easier, give the harder return movement more repetitions. The aim is not a fixed number of changes, but knowing in advance where each finger goes.")
      ] },
      { id: "puls", heading: text("Dodaj puls i menjaj akord na jedinicu", "Add a pulse and change chords on beat one"), paragraphs: [
        text("Izaberi spor tempo u metronomu iz zaglavlja sajta. Na primer, probaj 50 otkucaja u minutu, pa uspori ako ne stižeš da postaviš hvat. Broj 1–2–3–4, odsviraj Em samo na prvu dobu i pripremi Am za sledeću jedinicu. Zatim ponovi u suprotnom smeru.", "Choose a slow tempo in the metronome in the site's header. For example, try 50 beats per minute, then slow down if the shape is not ready in time. Count 1–2–3–4, strum Em only on beat one, and prepare Am for the next beat one. Then repeat in the other direction."),
        text("Kada prelaz postane ujednačen, sviraj po jedan lagan trzaj na svaku dobu. Ako se promena raspadne, vrati se na jedan trzaj po taktu. Tempo povećaj tek kada nekoliko uzastopnih prelaza ostane jasno i ravnomerno.", "Once the change is steady, add one gentle strum on each beat. If the transition falls apart, return to one strum per bar. Increase the tempo only after several consecutive changes stay clear and even.")
      ], example: "practice" },
      { id: "pesma", heading: text("Prenesi vežbu u jednu pesmu", "Apply the exercise to one song"), paragraphs: [
        text("Otvori izbor pesama za početnike i pogledaj akorde u konkretnom zapisu. Izdvoji samo dva hvata koja usporavaju sviranje, uvežbaj prelaz, pa ih vrati u pesmu. Mali broj akorda ne znači automatski lak ritam ili sporu promenu.", "Open the beginner song selection and check the chords in an individual chart. Isolate just two shapes that slow you down, practise the transition, then put them back into the song. Having few chords does not automatically mean an easy rhythm or slow changes."),
        text("Za kratku sesiju odvoji približno minut za proveru zvuka, dva minuta za putanju prstiju i dva za ravnomerno sviranje. To je predlog rasporeda, a ne rok u kom moraš savladati promenu.", "For a short session, allow roughly a minute to check the sound, two minutes for finger movements and two for steady playing. This is a suggested routine, not a deadline for mastering the change.")
      ] }
    ],
    links: [{ href: "/plejliste/beginner", label: text("Izaberi pesmu za početak", "Choose a song to start with") }, { href: "/plejliste/acoustic", label: text("Pesme sa otvorenim hvatovima", "Songs with open chord shapes") }],
    source: { href: "https://www.fender.com/articles/chords/5-tips-to-master-chord-changes", title: "Fender: 5 Tips to Master Chord Changes" }
  },
  {
    slug: "capo-i-promena-tonaliteta",
    title: text("Capo i promena tonaliteta: hvat naspram zvuka", "Capo and transposition: chord shape versus sounding chord"),
    description: text("Razlikuj oblik akorda od onoga što se čuje. Primer C–G–Am–F sa capoom na drugom pragu i objašnjenje transpozicije.", "Distinguish chord shapes from sounding chords. Try C–G–Am–F with a capo at fret 2 and understand transposition."),
    sections: [
      { id: "sta-radi", heading: text("Capo podiže zvuk istog hvata", "A capo raises the sound of the same chord shape"), paragraphs: [
        text("Ovde koristimo standardno štimovanje i capo preko svih šest žica. Kada ga postaviš na drugi prag i odsviraš oblik C, čuje se D. Isti pokret prstiju sada zvuči dva polustepena više. Svaki sledeći prag podiže isti oblik za još jedan polustepen.", "Here we use standard tuning and a capo across all six strings. Put it at fret 2 and play a C shape: the sounding chord is D. The same finger pattern now sounds two semitones higher. Each additional fret raises the same shape by another semitone."),
        text("Pragove hvata broji od capoa kao od novog početka vrata. Oblik Am zadržava svoj raspored prstiju u odnosu na capo, ali se menja ono što se čuje. Zato zapis „Am, capo 2” ne znači isto što i Am bez capoa.", "Count the frets of the chord shape from the capo as a new starting point. An Am shape keeps its fingering relative to the capo, but its sound changes. That is why 'Am, capo 2' is not the same as Am without a capo.")
      ] },
      { id: "primer", heading: text("Primer: isti oblici, dva polustepena viši zvuk", "Example: the same shapes, sounding two semitones higher"), paragraphs: [
        text("Niz C–G–Am–F ispod je samostalna vežba, ne zapis određene pesme. Bez capoa nazivi hvatova odgovaraju zvučnim akordima. Sa capoom na drugom pragu, isti oblici daju D–A–Bm–G. Mol ostaje mol: pomeranje ne pretvara Am u durski akord.", "The C–G–Am–F progression below is a standalone exercise, not the chart of a particular song. Without a capo, the shape names match the sounding chords. With a capo at fret 2, the same shapes produce D–A–Bm–G. Minor stays minor: the shift does not turn Am into a major chord.")
      ], example: "capo" },
      { id: "razlika", heading: text("Transpozicija zapisa menja nazive akorda", "Transposing a chart changes the chord names"), paragraphs: [
        text("Ako zapis C–G–Am–F transponuješ za +2 i sviraš bez capoa, sviraš D–A–Bm–G. Ako želiš taj isti viši zvuk uz stare oblike C–G–Am–F, ostavi zapis na originalu i koristi capo 2. To su dva načina da dobiješ isti skup zvučnih akorda, uz drugačije hvatove i raspored tonova.", "If you transpose C–G–Am–F by +2 and play without a capo, you play D–A–Bm–G. To get that same higher sound using the old C–G–Am–F shapes, leave the chart unchanged and use capo 2. These are two ways to obtain the same sounding chord names with different fingerings and voicings."),
        text("Ako običan zapis transponuješ za +2, pa samo fizički dodaš capo 2 bez ponovnog preračunavanja hvatova, podižeš zvuk ukupno za četiri polustepena u odnosu na početni primer. Pre sviranja sa drugima dogovorite da li nazivi označavaju hvatove uz capo ili akorde koji se zaista čuju.", "If you transpose an ordinary chart by +2 and then physically add capo 2 without recalculating the shapes, the sound rises by four semitones compared with the original example. Before playing with others, agree whether chord names describe capo-relative shapes or the chords that actually sound.")
      ] },
      { id: "primeni", heading: text("Kako da primeniš ovo na zapis pesme", "How to apply this to a song chart"), paragraphs: [
        text("Na sajtu kontrole tonaliteta +/− menjaju ciljani zvuk, dok panel Capo preračunava hvatove da sa izabranim capoom zadrže taj zvučni tonalitet. Za naš primer bez izvornog capoa, transpozicija +2 uz izabrani Capo prag 2 vraća oblike C–G–Am–F, koji zvuče D–A–Bm–G. Fizički capo sam postavljaš na gitaru.", "On this site, the +/− key controls change the target sound, while the Capo panel recalculates shapes to preserve that sounding key with the selected capo. For our example with no original capo, transposition +2 and capo fret 2 return the shapes C–G–Am–F, which sound D–A–Bm–G. You place the physical capo on the guitar yourself."),
        text("Pre primene pročitaj izvorne napomene o štimovanju i capou. Ako izvorna oznaka nije jasna, sajt ne nudi capo preporuku; tabulatura se ne preračunava kao hvatovi akorda. Ako želiš niži tonalitet od sviranja bez capoa, samo dodavanje capoa uz iste oblike to neće uraditi. Potrebni su drugi hvatovi ili drugačije štimovanje. Za početak probaj transpoziciju zapisa bez capoa i uporedi rezultat sa svojim glasom.", "Read the original tuning and capo notes first. If the original capo marking is unclear, the site does not offer a capo recommendation; tablature is not recalculated like chord shapes. If you want a lower key than playing without a capo, adding a capo while keeping the same shapes will not achieve it. You need different shapes or a different tuning. Start by transposing the chart without a capo and compare the result with your voice.")
      ] }
    ],
    links: [{ href: "/pesme", label: text("Otvori pesmu i proveri tonalitet", "Open a song and check its key") }, { href: "/akordi", label: text("Pronađi dijagram potrebnog akorda", "Find the chord diagram you need") }],
    source: { href: "https://www.fender.com/articles/parts-and-accessories/what-is-a-capo", title: "Fender: What Is a Capo?" }
  }
]

export function getGuitarGuide(slug: string) {
  return guitarGuides.find(guide => guide.slug === slug)
}

export const guidePath = (slug: string) => "/vodici/" + slug
