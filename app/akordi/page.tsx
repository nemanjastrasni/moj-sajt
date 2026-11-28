import { publicPageMetadata } from "@/lib/seo/metadata"
import { CHORD_ROOTS } from "@/lib/seo/catalog"
import UiText from "@/app/components/UiText"
import Link from "@/app/components/LocalizedLink"
import styles from "@/app/components/CatalogGuide.module.css"
import BasicGuitarChords from "@/app/components/BasicGuitarChords"
import GuideText from "@/app/components/GuideText"

export const metadata = publicPageMetadata("Gitarski akordi – Dijagrami i osnovni hvatovi", "Gitarski akordi Em, Am, C, G, D, Dm, E i A sa dijagramima. Nauči oznake žica i pragova, pronađi druge hvatove i pesme za vežbanje.", "/akordi")

export default function AkordiPage() {
  const roots = CHORD_ROOTS

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6"><UiText text="Akordi za gitaru" /></h1>
      <section aria-labelledby="svi-akordi" className={styles.guide}>
      <h2 id="svi-akordi"><GuideText text={{ sr: "Pregled akorda po osnovnom tonu", en: "Browse chords by root note" }} /></h2>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {roots.map((r) => (
          <a
            key={r}
            href={`/akordi/${encodeURIComponent(r)}`}
            className="p-6 bg-gray-900 rounded-xl text-center text-xl hover:bg-gray-800"
          >
            {r}
          </a>
        ))}
      </div>
      </section>
      <section className={styles.guide} aria-labelledby="osnovni-akordi">
        <h2 id="osnovni-akordi"><GuideText text={{ sr: "Osnovni akordi za gitaru", en: "Basic guitar chords" }} /></h2>
        <BasicGuitarChords />
      </section>
      <div className={styles.guide}>
        <p><GuideText text={{ sr: "Najdeblja žica je levo. X: ne sviraš žicu; 0: prazna žica; tačka: mesto pritiska.", en: "The thickest string is on the left. X: omit the string; 0: open string; dot: fretted position." }} /></p>
        <p><GuideText text={{ sr: "Pronađi gitarske akorde i njihove hvatove. Počni od osnovnih dijagrama ili izaberi ton za pregled drugih oblika.", en: "Find guitar chords and their shapes. Start with the basic diagrams or choose a root note to browse other shapes." }} /></p>
        <nav className={styles.links} aria-label="Pregled akorda">
          <a href="#osnovni-akordi"><GuideText text={{ sr: "Osnovni hvatovi", en: "Basic shapes" }} /></a>
          <a href="#svi-akordi"><GuideText text={{ sr: "Akordi po osnovnom tonu", en: "Chords by root note" }} /></a>
          <Link href="/pesme" prefetch={false}><GuideText text={{ sr: "Pesme sa akordima", en: "Songs with chords" }} /></Link>
        </nav>
      </div>
      <div className={styles.guide}>
        <p><GuideText text={{ sr: "Primeri su za standardno štimovanje E–A–D–G–B–E. Brojevi ispod mreže označavaju žice; niz ispod dijagrama pokazuje pragove od šeste do prve žice.", en: "These examples use standard E–A–D–G–B–E tuning. Numbers below the grid identify strings; the sequence below each diagram lists frets from string 6 to string 1." }} /></p>
        <p><GuideText text={{ sr: "Ovo je po jedan mogući hvat svakog akorda. Za druge oblike otvori odgovarajući osnovni ton. Najpre proveri žice pojedinačno, zatim vežbaj prelaz između dva hvata i primeni ih u pesmi.", en: "Each example shows one possible shape. Open its root note for other shapes. Check each string separately, then practise changing between two chords and apply them to a song." }} /></p>
      </div>
      <section className={styles.guide} aria-labelledby="reading-chords">
        <h2 id="reading-chords"><UiText text="Kako se čitaju oznake akorda?" /></h2>
        <p><UiText text="Slovo označava osnovni ton: C je C-dur, a dodatak m označava mol, kao u Am ili Dm. Znak # povisuje ton za polustepen. Brojevi i druge oznake, poput 7, maj7 i sus4, označavaju drugačiji sastav akorda." /></p>
        <h2><UiText text="Šta znače oznake na dijagramu?" /></h2>
        <p><UiText text="Oznaka X iznad žice znači da je ne sviraš, a 0 da žica ostaje prazna. Tačke pokazuju mesta na kojima pritiskaš žice. Obrati pažnju na početni prag: isti oblik pomeren uz vrat gitare može dati drugi akord." /></p>
        <h2><UiText text="Akordi za početnike" /></h2>
        <p><UiText text="Za prve vežbe možeš krenuti od otvorenih hvatova Em, Am, C, G i D. Vežbaj polako prelazak između dva hvata i proveri da li se potrebne žice jasno čuju, pa tek onda povećaj tempo." /></p>
        <nav className={styles.links} aria-labelledby="reading-chords">
          <Link href="/stimer" prefetch={false}><GuideText text={{ sr: "Online štimer za gitaru", en: "Online guitar tuner" }} /></Link>
          <Link href="/vodici/kako-se-citaju-akordi-za-gitaru" prefetch={false}><UiText text="Vodič za čitanje akorda i dijagrama" /></Link>
          <Link href="/plejliste/acoustic" prefetch={false}><UiText text="Pesme sa osnovnim otvorenim akordima" /></Link>
          <Link href="/plejliste/beginner" prefetch={false}><UiText text="Pesme za početnike" /></Link>
          <Link href="/pesme" prefetch={false}><UiText text="Pronađi pesme sa akordima" /></Link>
        </nav>
      </section>
    </div>
  )
}
