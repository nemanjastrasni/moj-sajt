import Link from "next/link"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import { guitarGuides, guidePath } from "@/lib/guitarGuides"
import { localizedHref } from "@/lib/i18n/routes"
import styles from "@/app/components/GuitarGuides.module.css"
import { publicPageMetadata } from "@/lib/seo/metadata"
export const metadata = publicPageMetadata("Guitar guides: chords, capo, playlists and PDF songbooks", "Learn to read guitar chord diagrams, practise chord changes and use a capo. Create guitar playlists, PDF songbooks and YouTube listening lists.", "/en/guides")
export default function EnglishGuidesPage() {
  return <article className={styles.page}>
    <Breadcrumbs label="Page path" items={[{ name: "Home", path: "/en" }, { name: "Guitar guides", path: "/en/guides" }]} />
    <h1>Guitar guides</h1>
    <p className={styles.intro}>Start by reading chord diagrams, practise changing between two shapes and learn how a capo changes the sounding key. Then build your repertoire in a playlist, prepare a PDF songbook or create a YouTube listening list.</p>
    <div className={styles.cards}>{guitarGuides.map((guide, index) => <section className={styles.card} key={guide.slug}>
      <h2><Link href={localizedHref(guidePath(guide.slug), "en")} prefetch={false}><span aria-hidden="true">{index + 1}. </span>{guide.title.en}</Link></h2>
      <p>{guide.description.en}</p>
    </section>)}</div>
    <nav className={styles.links} aria-label="Chords and songs"><Link href="/en/guitar-tuner" prefetch={false}>Online guitar tuner</Link><Link href="/en/guitar-chords" prefetch={false}>Browse chord diagrams</Link><Link href="/plejliste/beginner" prefetch={false}>Choose a song to start with</Link></nav>
  </article>
}
