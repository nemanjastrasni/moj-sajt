import Link from "next/link"
import Breadcrumbs from "@/app/components/Breadcrumbs"
import GuideText from "@/app/components/GuideText"
import styles from "@/app/components/GuitarGuides.module.css"
import { guitarGuides, guidePath } from "@/lib/guitarGuides"
import { publicPageMetadata } from "@/lib/seo/metadata"

export const metadata = publicPageMetadata("Vodiči za gitaru: akordi, vežbanje i capo", "Praktični vodiči za početnike uz dijagrame, vežbu promene akorda i objašnjenje capoa i transpozicije.", "/vodici")

export default function GuitarGuidesPage() {
  return <div className={styles.page}>
    <Breadcrumbs items={[{ name: "Početna", path: "/" }, { name: "Vodiči za gitaru", path: "/vodici" }]} />
    <h1><GuideText text={{ sr: "Vodiči za gitaru", en: "Guitar guides" }} /></h1>
    <p className={styles.intro}><GuideText text={{ sr: "Kreni od čitanja dijagrama, uvežbaj prelaz između dva hvata i razjasni šta se menja kada koristiš capo. Svaki vodič ima primer koji možeš odmah probati na gitari.", en: "Start by reading diagrams, practise a transition between two shapes, and understand what changes when you use a capo. Each guide includes an example to try on your guitar." }} /></p>
    <div className={styles.cards}>{guitarGuides.map((guide, index) => <article className={styles.card} key={guide.slug}>
      <h2><Link href={guidePath(guide.slug)} prefetch={false}><span aria-hidden="true">{index + 1}. </span><GuideText text={guide.title} /></Link></h2>
      <p><GuideText text={guide.description} /></p>
    </article>)}</div>
    <nav className={styles.links} aria-label="Akordi i pesme"><Link href="/akordi" prefetch={false}><GuideText text={{ sr: "Pregledaj dijagrame akorda", en: "Browse chord diagrams" }} /></Link><Link href="/plejliste/beginner" prefetch={false}><GuideText text={{ sr: "Izaberi pesmu za početak", en: "Choose a song to start with" }} /></Link></nav>
  </div>
}
