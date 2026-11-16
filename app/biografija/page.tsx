import { publicPageMetadata } from "@/lib/seo/metadata"
import Link from "next/link"
import UiText, { CategoryLabel } from "@/app/components/UiText"
import MusicButton from "@/app/components/MusicButton"
import GuideText from "@/app/components/GuideText"
import guide from "@/app/components/CatalogGuide.module.css"

const categories = [
  { key: "domace", label: "Zabavne" },
  { key: "strane", label: "Strane" },
  { key: "narodne", label: "Narodne" },
]

export const metadata = publicPageMetadata("Biografije i diskografije izvođača", "Biografije muzičara i bendova, diskografije i albumi. Pregledaj izvođače po kategoriji i početnom slovu.", "/biografija")

export default function BiografijePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-white">
      <div className="mb-8 flex flex-wrap gap-3"><MusicButton /><Link href="/public-listening-playlists" className="ui-button"><UiText text="Javne muzicke liste" /></Link></div>

      <ul className="space-y-4 text-lg">
        {categories.map((cat) => (
          <li key={cat.key}>
            <Link
              href={`/biografija/${cat.key}`}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              <CategoryLabel value={cat.key} />
            </Link>
          </li>
        ))}
      </ul>

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
