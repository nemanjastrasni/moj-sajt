import { createHash } from "node:crypto"
import { biographyText } from "./catalog"
import { reviewedBiographyRoute } from "./routes"

const reviewed = {
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
