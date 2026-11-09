import { publicPageMetadata } from "@/lib/seo/metadata"
import UiText from "@/app/components/UiText"
import Link from "next/link"
import styles from "@/app/components/CatalogGuide.module.css"



export const metadata = publicPageMetadata("Pesme sa akordima za gitaru", "Akordi i tekstovi zabavnih, narodnih i stranih pesama. Pronađi izvođača i izaberi pesmu za sviranje.", "/pesme")

export default function PesmePage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1><UiText text="Pesme sa akordima za gitaru" /></h1>
      <div className={styles.guide}>
        <p><UiText text="Izaberi zabavne, narodne ili strane pesme. U kategoriji pronađi izvođača po početnom slovu, a pretragom u zaglavlju možeš tražiti naslov pesme ili ime izvođača." /></p>
        <h2><UiText text="Izaberi kategoriju" /></h2>
      </div>

      <ul>
        <li>
          <Link href="/pesme/domace"><UiText text="Zabavne" /></Link>
        </li>

        <li>
          <Link href="/pesme/strane"><UiText text="Strane" /></Link>
        </li>

        <li>
          <Link href="/pesme/narodne"><UiText text="Narodne" /></Link>
        </li>
      </ul>
      <section className={styles.guide} aria-labelledby="song-start">
        <h2 id="song-start"><UiText text="Od koje pesme početi?" /></h2>
        <p><UiText text="Ako učiš prve hvatove, pogledaj izbor lakših pesama ili pesama sa najviše četiri različita akorda. Procena težine je orijentaciona: broj akorda ne govori koliko su zahtevan ritam i brzina promene hvatova." /></p>
        <nav className={styles.links} aria-labelledby="song-start">
          <Link href="/plejliste/beginner" prefetch={false}><UiText text="Pesme za početnike" /></Link>
          <Link href="/plejliste/4-akorda" prefetch={false}><UiText text="Pesme sa do četiri akorda" /></Link>
          <Link href="/plejliste/acoustic" prefetch={false}><UiText text="Pesme sa osnovnim otvorenim akordima" /></Link>
        </nav>
        <h2><UiText text="Kako koristiti zapis pesme" /></h2>
        <p><UiText text="Otvori pesmu i proveri njen zapis. Kada su akordi uneti, možeš promeniti tonalitet i uključiti njihove dijagrame. Pojedini zapisi sadrže samo tekst ili tabulaturu; naslov stranice označava koji je sadržaj dostupan." /></p>
        <Link href="/akordi" prefetch={false}><UiText text="Pogledaj dijagrame i oznake akorda" /></Link>
      </section>
    </div>
  )
}
