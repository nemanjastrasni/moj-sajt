import { publicPageMetadata } from "@/lib/seo/metadata"
import Link from "next/link"
import UiText from "@/app/components/UiText"
import { catalogEntries } from "@/lib/playlists/catalog-model"
import { difficultyExplanation } from "@/lib/music/difficultyModel"
import styles from "@/app/components/PlaylistClient.module.css"
import difficultyStyles from "@/app/components/SongDifficulty.module.css"
import GuideText from "@/app/components/GuideText"

export const metadata = publicPageMetadata("Plejliste za gitaru – Pesme po težini i akordima", "Izaberi pesme prema težini sviranja, broju akorda i kategoriji. Pronađi repertoar za vežbanje i svoje plejliste.", "/plejliste")

export default function PlaylistsPage() {
  return <main className={styles.page}>
    <div className={styles.header}><h1><UiText text="Plejliste" /></h1><Link className={styles.button} href="/profile/plejliste"><UiText text="Moje plejliste" /></Link></div>
    <section className={styles.band} aria-labelledby="playlist-repertoire">
      <h2 id="playlist-repertoire"><GuideText text={{ sr: "Repertoar za gitaru i PDF pesmarica", en: "Guitar repertoire and PDF songbooks" }} /></h2>
      <p><GuideText text={{ sr: "Izaberi javni pregled pesama po težini, akordima ili kategoriji. Za svoj repertoar prijavi se i dodaj pesme u ličnu plejlistu, uredi redosled za probu, koristi režim sviranja ili izvezi PDF pesmaricu. Muzičke liste za slušanje YouTube snimaka nalaze se u zasebnom odeljku.", en: "Browse public song selections by difficulty, chords or category. For a personal repertoire, sign in and add songs to your own playlist, arrange a rehearsal order, use performance mode or export a PDF songbook. Lists for listening to YouTube recordings have a separate section." }} /></p>
      <Link className={styles.button} href="/vodici/plejliste-za-gitaru-i-pdf-pesmarica" prefetch={false}><GuideText text={{ sr: "Korak po korak: napravi plejlistu i PDF", en: "Step by step: create a playlist and PDF" }} /></Link>
    </section>
    <section className={styles.band}>
      <h2><UiText text="Po težini" /></h2>
      <p className={styles.notice}><UiText text={difficultyExplanation} /></p>
      <div className={styles.actions}>{catalogEntries.filter(entry => entry.level).map(entry => <Link className={`${styles.button} ${difficultyStyles.label}`} data-difficulty={entry.level} key={entry.slug} href={`/plejliste/${entry.slug}`}><UiText text={entry.title} /></Link>)}</div>
    </section>
    <section className={styles.band}><h2><UiText text="Po akordima" /></h2><div className={styles.actions}>
      {catalogEntries.filter(entry => ["4-akorda", "acoustic"].includes(entry.slug)).map(entry => <Link className={styles.button} key={entry.slug} href={`/plejliste/${entry.slug}`}><UiText text={entry.title} /></Link>)}
    </div></section>
    <section className={styles.band}><h2><UiText text="Kategorije" /></h2><div className={styles.actions}>
      {["domace", "strane", "narodne"].map(slug => <Link key={slug} className={styles.button} href={`/plejliste/${slug}`}><UiText text={catalogEntries.find(entry => entry.slug === slug)!.title} /></Link>)}
    </div></section>
    <section className={styles.band}><h2><UiText text="Izbor pesama" /></h2><div className={styles.actions}>
      <Link className={styles.button} href="/plejliste/pesme-koje-znam"><UiText text="Pesme koje mogu da sviram" /></Link>
      {["domace", "strane", "narodne"].map(slug => <Link className={styles.button} key={slug} href={`/top-50/${slug}`}><UiText text={{ domace: "Top 50 zabavnih", strane: "Top 50 stranih", narodne: "Top 50 narodnih" }[slug]!} /></Link>)}
    </div></section>
    <section className={styles.band}><h2><UiText text="Liste za slušanje" /></h2><div className={styles.actions}>
      <Link className={styles.button} href="/listening-playlist"><UiText text="Moja muzika" /></Link>
      <Link className={styles.button} href="/public-listening-playlists"><UiText text="Javne muzicke liste" /></Link>
      {["domace", "strane", "narodne", "mix"].map(slug => <Link className={styles.button} key={slug} href={`/top-listening-playlists/${slug}`}><UiText text={{ domace: "20 najslušanijih zabavnih", strane: "20 najslušanijih stranih", narodne: "20 najslušanijih narodnih", mix: "20 najslušanijih Mix plejlisti" }[slug]!} /></Link>)}
    </div></section>
  </main>
}
