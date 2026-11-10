import { publicPageMetadata } from "@/lib/seo/metadata"
import { CHORD_ROOTS } from "@/lib/seo/catalog"
import UiText from "@/app/components/UiText"
import Link from "next/link"
import styles from "@/app/components/CatalogGuide.module.css"

export const metadata = publicPageMetadata("Akordi za gitaru – Dijagrami i hvatovi", "Pregled akorda za gitaru po osnovnom tonu. Pronađi durske, molske i druge hvatove sa dijagramima.", "/akordi")

export default function AkordiPage() {
  const roots = CHORD_ROOTS

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6"><UiText text="Akordi za gitaru" /></h1>
      <div className={styles.guide}>
        <p><UiText text="Izaberi osnovni ton da pronađeš dijagrame hvatova. Na stranici jednog tona nalaze se durski, molski i drugi akordi koji počinju tim tonom." /></p>
      </div>

      <div className="grid grid-cols-4 gap-4">
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
      <section className={styles.guide} aria-labelledby="reading-chords">
        <h2 id="reading-chords"><UiText text="Kako se čitaju oznake akorda?" /></h2>
        <p><UiText text="Slovo označava osnovni ton: C je C-dur, a dodatak m označava mol, kao u Am ili Dm. Znak # povisuje ton za polustepen. Brojevi i druge oznake, poput 7, maj7 i sus4, označavaju drugačiji sastav akorda." /></p>
        <h2><UiText text="Šta znače oznake na dijagramu?" /></h2>
        <p><UiText text="Oznaka X iznad žice znači da je ne sviraš, a 0 da žica ostaje prazna. Tačke pokazuju mesta na kojima pritiskaš žice. Obrati pažnju na početni prag: isti oblik pomeren uz vrat gitare može dati drugi akord." /></p>
        <h2><UiText text="Akordi za početnike" /></h2>
        <p><UiText text="Za prve vežbe možeš krenuti od otvorenih hvatova Em, Am, C, G i D. Vežbaj polako prelazak između dva hvata i proveri da li se potrebne žice jasno čuju, pa tek onda povećaj tempo." /></p>
        <nav className={styles.links} aria-labelledby="reading-chords">
          <Link href="/vodici/kako-se-citaju-akordi-za-gitaru" prefetch={false}><UiText text="Vodič za čitanje akorda i dijagrama" /></Link>
          <Link href="/plejliste/acoustic" prefetch={false}><UiText text="Pesme sa osnovnim otvorenim akordima" /></Link>
          <Link href="/plejliste/beginner" prefetch={false}><UiText text="Pesme za početnike" /></Link>
          <Link href="/pesme" prefetch={false}><UiText text="Pronađi pesme sa akordima" /></Link>
        </nav>
      </section>
    </div>
  )
}
