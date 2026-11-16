import { publicPageMetadata } from "@/lib/seo/metadata"
import Link from "next/link"
import UiText, { CategoryLabel } from "@/app/components/UiText"
import MusicButton from "@/app/components/MusicButton"
import GuideText from "@/app/components/GuideText"
import guide from "@/app/components/CatalogGuide.module.css"
import styles from "./page.module.css"

const categories = [
  { key: "domace", description: { sr: "Domaća i ex-Yu muzika", en: "Domestic and ex-Yu music" } },
  { key: "strane", description: { sr: "Svetski muzičari i bendovi", en: "International musicians and bands" } },
  { key: "narodne", description: { sr: "Narodna i folk muzika", en: "Folk music" } },
]

export const metadata = publicPageMetadata("Biografije i diskografije izvođača", "Biografije muzičara i bendova, diskografije i albumi. Pregledaj izvođače po kategoriji i početnom slovu.", "/biografija")

export default function BiografijePage() {
  return (
    <div className={styles.page}>
      <nav className={styles.categories} aria-labelledby="biography-categories">
        <p id="biography-categories" className={styles.prompt}><GuideText text={{ sr: "Izaberi kategoriju", en: "Choose a category" }} /></p>
        <ul className={styles.list}>
          {categories.map((cat) => (
            <li key={cat.key}>
              <Link
                href={`/biografija/${cat.key}`}
                className={styles.card}
              >
                <span>
                  <span className={styles.title}><CategoryLabel value={cat.key} /></span>
                  <span className={styles.description}><GuideText text={cat.description} /></span>
                </span>
                <span className={styles.arrow} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-8 flex flex-wrap gap-3"><MusicButton /><Link href="/public-listening-playlists" className="ui-button"><UiText text="Javne muzicke liste" /></Link></div>

      <h1 className="text-3xl font-bold mb-6">
        <GuideText text={{ sr: "Biografije i diskografije izvođača", en: "Artist biographies and discographies" }} />
      </h1>
      <div className={guide.guide}>
        <p><GuideText text={{ sr: "Pronađi muzičare i bendove iz domaće, narodne i strane muzike. Izaberi kategoriju i početno slovo, pa otvori profil izvođača sa dostupnom biografijom i diskografijom.", en: "Find musicians and bands from domestic pop and rock, folk and international music. Choose a category and initial, then open an artist's profile with an available biography or discography." }} /></p>
        <p><GuideText text={{ sr: "Na profilima su, kada su podaci uneti, albumi razdvojeni na studijska izdanja, singlove, kompilacije i koncertna izdanja. Godina i izdavač prate raspoložive podatke. Veze ka pesmama omogućavaju da od priče o izvođaču pređeš na zapis za gitaru.", en: "Where provided, releases are organised into studio albums, singles, compilations and live releases. Years and labels reflect the available data. Song links take you from an artist's background to a guitar chart." }} /></p>
        <nav className={guide.links} aria-label="Izvođači, pesme i izvori">
          <Link href="/pesme" prefetch={false}><GuideText text={{ sr: "Pesme sa akordima", en: "Songs with chords" }} /></Link>
          <Link href="/wiki-izvori" prefetch={false}><GuideText text={{ sr: "Izvori biografija i diskografija", en: "Biography and discography sources" }} /></Link>
        </nav>
      </div>
    </div>
  )
}
