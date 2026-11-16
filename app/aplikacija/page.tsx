import Link from "next/link"
import AppInstall from "@/app/components/AppInstall"
import GuideText from "@/app/components/GuideText"
import styles from "@/app/components/GuitarGuides.module.css"
import { publicPageMetadata } from "@/lib/seo/metadata"

export const metadata = publicPageMetadata("GitaraAkordi na telefonu – Instalacija", "Dodaj GitaraAkordi na početni ekran Android telefona ili iPhone-a. Otvaraj pesme i plejliste preko ikonice, uz internet vezu.", "/aplikacija")

export default function ApplicationPage() {
  return <article className={styles.page}>
    <h1><GuideText text={{ sr: "GitaraAkordi na telefonu", en: "GitaraAkordi on your phone" }} /></h1>
    <p className={styles.intro}><GuideText text={{ sr: "Dodaj ikonicu na početni ekran i otvaraj pesme i plejliste kao aplikaciju. Instalacija je besplatna, a koristiš isti GitaraAkordi nalog.", en: "Add an icon to your home screen and open songs and playlists as an app. Installation is free and uses your existing GitaraAkordi account." }} /></p>
    <AppInstall />
    <section className={styles.section}>
      <h2>Android</h2>
      <ol className={styles.steps}>
        <li><GuideText text={{ sr: "Otvori gitarakordi.com u Chrome-u ili drugom pregledaču koji podržava instalaciju.", en: "Open gitarakordi.com in Chrome or another browser that supports installation." }} /></li>
        <li><GuideText text={{ sr: "Ako je prikazano, dodirni „Instaliraj GitaraAkordi“. Možeš otvoriti i meni pregledača ⋮ pa izabrati „Instaliraj aplikaciju“ ili „Dodaj na početni ekran“; naziv zavisi od pregledača.", en: "If shown, tap “Install GitaraAkordi”. Or open the browser menu ⋮ and choose “Install app” or “Add to Home screen”; wording varies by browser." }} /></li>
        <li><GuideText text={{ sr: "Potvrdi dodavanje, pa otvori GitaraAkordi ikonicu na telefonu.", en: "Confirm, then open the GitaraAkordi icon on your phone." }} /></li>
      </ol>
    </section>
    <section className={styles.section}>
      <h2>iPhone / iPad</h2>
      <ol className={styles.steps}>
        <li><GuideText text={{ sr: "Otvori gitarakordi.com u Safari-ju.", en: "Open gitarakordi.com in Safari." }} /></li>
        <li><GuideText text={{ sr: "Otvori meni „Podeli“ (Share), pa izaberi „Dodaj na početni ekran“ (Add to Home Screen). Ako je ponuđeno „Open as Web App“, ostavi tu opciju uključenu.", en: "Open Share, then choose Add to Home Screen. If Open as Web App is offered, leave it enabled." }} /></li>
        <li><GuideText text={{ sr: "Potvrdi „Dodaj“ (Add). Aplikaciju zatim otvaraš preko nove ikonice.", en: "Confirm Add, then launch the app from its new icon." }} /></li>
      </ol>
    </section>
    <section className={styles.section}>
      <h2><GuideText text={{ sr: "Pesme, nalog i sviranje", en: "Songs, your account and playing" }} /></h2>
      <p><GuideText text={{ sr: "Za učitavanje pesama, plejlista i YouTube snimaka potrebna je internet veza. Ako aplikacija zatraži prijavu, prijavi se istim nalogom koji koristiš na sajtu. Instalacija ne briše tvoje plejliste.", en: "Loading songs, playlists and YouTube recordings requires an internet connection. If the app asks you to sign in, use your existing account. Installation does not delete your playlists." }} /></p>
      <p><GuideText text={{ sr: "Za širi pregled pesme možeš okrenuti telefon vodoravno, ako je rotacija ekrana omogućena u podešavanjima telefona. Aplikacija ne zaključava smer ekrana.", en: "For a wider song view, turn your phone sideways if screen rotation is enabled in your phone settings. The app does not lock screen orientation." }} /></p>
      <nav className={styles.links}>
        <Link href="/pesme" prefetch={false}><GuideText text={{ sr: "Pronađi pesmu", en: "Find a song" }} /></Link>
        <Link href="/profile/plejliste" prefetch={false}><GuideText text={{ sr: "Moje plejliste", en: "My playlists" }} /></Link>
        <Link href="/akordi" prefetch={false}><GuideText text={{ sr: "Dijagrami akorda", en: "Chord diagrams" }} /></Link>
      </nav>
    </section>
  </article>
}
