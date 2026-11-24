import { createHash } from "node:crypto"
import { biographyText } from "./catalog"
import { reviewedBiographyRoute } from "./routes"

const reviewed = {
  "aleksa-jelic": {
    oldBiographyHash: "c199069aaec2e1aa4c8f2ca1b2af29fa0ca40c69dd378f3e7fb2e5e5ea898cfd",
    paragraphs: {
      sr: [
        "Aleksa Jelić je srpski pop pevač i baletski igrač. Sa 17 godina pridružio se stalnoj baletskoj postavi Pozorišta na Terazijama u Beogradu. Plesnu karijeru nastavio je i na scenama u Barseloni.",
        "Na Beoviziji 2008. osvojio je drugo mesto sa Anom Štajdohar. Njihov duet „Beli jablan“ našao se na njegovom debitantskom albumu „U tami disko kluba“, na kojem je i pesma „Mila“.",
        "Na drugom albumu, „Javna tajna“, snimio je obradu „Flojda“, kompozicije Zorana Simjanovića. Treći studijski album, „Metamorfoza“, objavio je 2019.",
      ],
      en: [
        "Aleksa Jelić is a Serbian pop singer and ballet dancer. At 17, he joined the resident ballet company at Belgrade’s Theatre on Terazije. His dance career also took him to stages in Barcelona.",
        "In 2008, he and Ana Štajdohar placed second at Beovizija, Serbia’s Eurovision selection. Their duet Beli jablan appeared on his debut album U tami disko kluba alongside the song Mila.",
        "For his second album, Javna tajna, he recorded a cover of Zoran Simjanović’s Floyd. His third studio album, Metamorfoza, came out in 2019.",
      ],
    },
    sources: [
      { name: "RTS", href: "https://www.rts.rs/rts/pesma-evrovizije/pesma-evrovizije-2015/vesti/1829702/upoznajte-aleksu-jelica.html" },
      { name: "Aleksa Jelić", href: "https://aleksajelic.rs/" },
      { name: "RTS – Flojd", href: "https://www.rts.rs/lat/magazin/Muzika/725312/%E2%80%9EFlojd%E2%80%9C%2Bu%2Bnovom%2Britmu%2B-%2Bbesplatno%21.html" },
    ],
  },
  "aleksandra-kovac": {
    oldBiographyHash: "b9be63188ef2c87ba9ddf2bb02110380b0708c9d9422265938237bb2738b505a",
    paragraphs: {
      sr: [
        "Aleksandra Kovač je srpska kantautorka, producentkinja i kompozitorka muzike za film i televiziju. Sa sestrom Kristinom osnovala je duo K2, koji je 1995. objavio album „’Ajmo u život“.",
        "Posle rada u duu objavila je samostalni album „Med i mleko“. Na dodeli MTV Europe Music Awards u Kopenhagenu 2006. osvojila je regionalnu nagradu Best Adriatic Act.",
        "Studije kompozicije za film i druge ekranske formate završila je u Edinburgu 2014. Njena muzika se može čuti u televizijskoj seriji „Ubice mog oca“ i filmu „Dara iz Jasenovca“.",
      ],
      en: [
        "Aleksandra Kovač is a Serbian singer-songwriter, producer and composer for film and television. She and her sister Kristina formed the duo K2, which released the album ’Ajmo u život in 1995.",
        "She went on to release the solo album Med i mleko. In 2006, she received the regional Best Adriatic Act award at the MTV Europe Music Awards in Copenhagen.",
        "Kovač graduated in Composition for Screen in Edinburgh in 2014. Her screen credits include the television series Ubice mog oca and the film Dara of Jasenovac.",
      ],
    },
    sources: [
      { name: "RTS", href: "https://www.rts.rs/lat/radio/radio-rokenroler/5550474/pop-rok-azbucnik--aleksandra-kovac.html" },
      { name: "University of Edinburgh", href: "https://alumni.ed.ac.uk/services/profiles/graduation/2010s/aleksandra-kovac" },
      { name: "Vlada Republike Srbije", href: "https://www.srbija.gov.rs/vest/en/28557/aleksandra-kovac-receives-mtv-best-adriatic-act-award.php" },
      { name: "ARSFID", href: "https://arsfid.edu.rs/baza-arsfid/kovac-aleksandra/" },
    ],
  },
  "aleksandra-prijovic": {
    oldBiographyHash: "e199bb61ab9a95601d69892661e9de5bef9ee318e543441008539e6ef296648d",
    paragraphs: {
      sr: [
        "Aleksandra Prijović je srpska pevačica koja je široj publici postala poznata u takmičenju „Zvezde Granda“. U saradnji sa grupom Lexington snimila je pesmu „Dođi sebi“, a „Legitimno“ je među njenim samostalnim izdanjima.",
        "Posle albuma „Testament“ usledili su „Zvuk tišine“ 2022. i „Devet života“ 2023. Na albumu „Devet života“ nalaze se naslovna pesma i „Dam dam dam“.",
        "U septembru 2023. započela je regionalnu turneju „Od istoka do zapada“ sa tri koncerta u Beogradskoj areni.",
      ],
      en: [
        "Serbian singer Aleksandra Prijović first reached a wider audience through the televised competition Zvezde Granda. She recorded Dođi sebi with the band Lexington, while Legitimno is one of her solo releases.",
        "She followed Testament with Zvuk tišine in 2022 and Devet života in 2023. Devet života features the title track and Dam dam dam.",
        "She opened her regional Od istoka do zapada tour with three shows at Belgrade Arena in September 2023.",
      ],
    },
    sources: [
      { name: "Aleksandra Prijović", href: "https://aleksandraprijovic.rs/" },
      { name: "Apple Music – Zvuk tišine", href: "https://music.apple.com/us/album/zvuk-ti%C5%A1ine/1635768719" },
      { name: "Apple Music – Devet života", href: "https://music.apple.com/us/album/devet-zivota/1694277852" },
      { name: "Grand Online", href: "https://grand.nova.rs/showbiz/najemotivniji-koncert-ikada-pogledajte-sve-detalje-spektakla-aleksandre-prijovic-u-areni-video/" },
    ],
  },
  "aleksandra-radovic": {
    oldBiographyHash: "7a367c58be02cc778ca6ddb074d942cda985a9975401cc60a0c241d7fb344ccc",
    paragraphs: {
      sr: [
        "Aleksandra Radović je srpska pop kantautorka i vokalna solistkinja iz Bogatića. Diplomirala je muzičku pedagogiju na Akademiji umetnosti u Novom Sadu. Pre solističke karijere radila je kao studijska muzičarka i pevala prateće vokale.",
        "Nastup sa pesmom „Kao so u moru“ na festivalu Sunčane skale prethodio je njenom prvom studijskom albumu, koji je 2003. objavila pod svojim imenom. Na drugom albumu, „Dommino“, nalazi se „Karta za jug“, pesma sa kojom je osvojila drugo mesto na Budvanskom festivalu 2005.",
        "Među njenim kasnijim studijskim izdanjima su „Žar ptica“, „Carstvo“ i „Predvorje života“.",
      ],
      en: [
        "Aleksandra Radović is a Serbian pop singer-songwriter and vocalist from Bogatić. She graduated in music education from the Academy of Arts in Novi Sad. Before launching her solo career, she worked as a studio musician and backing singer.",
        "She performed Kao so u moru at the Sunčane skale festival before releasing her self-titled debut album in 2003. Her second album, Dommino, features Karta za jug, the song with which she took second place at the 2005 Budva Music Festival.",
        "Her later studio albums include Žar ptica, Carstvo and Predvorje života.",
      ],
    },
    sources: [
      { name: "Aleksandra Radović", href: "https://aleksandraradovic.com/biografija/" },
      { name: "Aleksandra Radović (2003)", href: "https://aleksandraradovic.com/diskografija/aleksandra-radovic/" },
      { name: "Dommino", href: "https://aleksandraradovic.com/diskografija/dommino/" },
    ],
  },
  "alen-islamovic": {
    oldBiographyHash: "d25110d44caa70131bbe20728fc6a23ffbfab8b36cba36be18eceed0acc64676",
    paragraphs: {
      sr: [
        "Alen Islamović je bosanskohercegovački rok pevač iz okoline Bihaća. U Divlje jagode ušao je kao basista, a potom preuzeo ulogu glavnog vokala. Sa bendom je snimio album „Motori“, objavljen 1982.",
        "U drugoj polovini osamdesetih postao je pevač Bijelog dugmeta. Sa grupom je snimao album „Pljuni i zapjevaj moja Jugoslavijo“, a među pesmama iz tog perioda su „Ružica si bila“ i „Napile se ulice“.",
        "Posle Bijelog dugmeta nastavio je samostalnu karijeru i nastupao sa sastavom 4 Asa. Među njegovim samostalnim albumima su „Alcatraz“ iz 2013. i „Tajno“, koji je Croatia Records objavio 2019.",
      ],
      en: [
        "Alen Islamović is a rock singer from the Bihać area of Bosnia and Herzegovina. He joined Divlje jagode as a bassist before becoming their lead singer. He recorded the album Motori with the band, released in 1982.",
        "In the second half of the 1980s, he became the singer of Bijelo dugme and recorded Pljuni i zapjevaj moja Jugoslavijo with the group. Songs from his time with them include Ružica si bila and Napile se ulice.",
        "After Bijelo dugme, he pursued a solo career and performed with the group 4 Asa. His solo albums include Alcatraz from 2013 and Tajno, released by Croatia Records in 2019.",
      ],
    },
    sources: [
      { name: "Alen Islamović", href: "https://alenislamovic.com/biografija" },
      { name: "Croatia Records", href: "https://crorec.net/izvodjac/alen-islamovic/" },
      { name: "Croatia Records – Tajno", href: "https://crorec.net/album/alen-islamovic-tajno/" },
    ],
  },
} as const

type ReviewedArtist = Parameters<typeof reviewedBiographyRoute>[0]
type SourceArtist = ReviewedArtist & { bio?: string | null; bioShort?: string | null }

export function getReviewedBiography(artist: ReviewedArtist) {
  const route = reviewedBiographyRoute(artist)
  return route ? { route, ...reviewed[route.slug] } : null
}

const cyrillic: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž", З: "Z", И: "I", Ј: "J", К: "K", Л: "L", Љ: "Lj", М: "M", Н: "N", Њ: "Nj", О: "O", П: "P", Р: "R", С: "S", Т: "T", Ћ: "Ć", У: "U", Ф: "F", Х: "H", Ц: "C", Ч: "Č", Џ: "Dž", Ш: "Š",
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u", ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š",
}

export function biographyLatin(text: string) {
  return text.replace(/[А-я]/g, character => cyrillic[character] || character)
}

export function reviewedSerbianBiography(artist: SourceArtist) {
  const edition = getReviewedBiography(artist)
  if (!edition) return null
  const current = biographyLatin(biographyText(artist.bio) || biographyText(artist.bioShort))
  // Corrections only replace the exact bad text we verified. Later admin edits win.
  const hash = createHash("sha256").update(current).digest("hex")
  return hash === edition.oldBiographyHash ? edition : null
}
