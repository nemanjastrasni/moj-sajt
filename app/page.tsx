import Link from "next/link"
import { getHomeSongs } from "@/lib/homeSongsServer"
import StructuredData from "./components/StructuredData"
import { websiteData } from "@/lib/seo/structured-data"
import Hero from "./components/Hero"
import PopularSongs from "./components/PopularSongs"
import LatestSongs from "./components/LatestSongs"

import UiText from "./components/UiText"
import HomeRepertoire from "./components/HomeRepertoire"
import SiteImage from "./components/SiteImage"
import { publicPageMetadata } from "@/lib/seo/metadata"
import { SITE_NAME } from "@/lib/brand"
import guide from "./components/CatalogGuide.module.css"
import GuideText from "./components/GuideText"
import intro from "./components/HomeIntroduction.module.css"

const homeTitle = `Akordi za gitaru i tekstovi pesama | ${SITE_NAME}`
const homeMetadata = publicPageMetadata(homeTitle, "Akordi za gitaru i tekstovi zabavnih, narodnih i stranih pesama. Pronađi pesmu, promeni tonalitet i sačuvaj svoj repertoar u plejlisti.", "/")

export const metadata = { ...homeMetadata, title: { absolute: homeTitle } }
export const revalidate=60

export default async function HomePage() {
  const [popular,latest]=await Promise.all([getHomeSongs("popular").catch(()=>undefined),getHomeSongs("latest").catch(()=>undefined)])

  return (
    <div className="w-full home-page">
      <StructuredData data={websiteData()} />
      <HomeRepertoire />

      {/* HERO (NOVI) */}
      <Hero />

      {/* KATEGORIJE */}
      <section className="max-w-6xl mx-auto px-6 py-14">

        <h2 className="text-2xl font-bold mb-8 text-white">
          <UiText text="Pesme" />
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          <Link
            href="/pesme/narodne"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <SiteImage
              name="categoryNarodne"
              sizes="(min-width: 768px) 360px, calc(100vw - 80px)"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="theme-dark-surface absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                <UiText text="Narodne" />
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/domace"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <SiteImage
              name="categoryDomace"
              sizes="(min-width: 768px) 360px, calc(100vw - 80px)"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="theme-dark-surface absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                <UiText text="Zabavne" />
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/strane"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <SiteImage
              name="categoryStrane"
              sizes="(min-width: 768px) 360px, calc(100vw - 80px)"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="theme-dark-surface absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                <UiText text="Strane" />
              </span>
            </div>
          </Link>

        </div>

      </section>
      <PopularSongs initialSongs={popular}/>
      <LatestSongs initialSongs={latest}/>
      <section className="mx-auto max-w-6xl px-6 py-6" aria-labelledby="home-song-guide">
        <div className={guide.guide}>
          <header className={intro.intro}>
            <h1 id="home-song-guide"><UiText text="Akordi za gitaru i tekstovi pesama" /></h1>
            <p><GuideText text={{ sr: "Pronađi pesmu po naslovu ili izvođaču, pogledaj hvatove i sastavi repertoar za vežbanje.", en: "Find a guitar song by title or artist, check chord shapes and build a practice repertoire." }} /></p>
          </header>
          <nav className={guide.links} aria-labelledby="home-song-guide">
            <Link href="/vodici" prefetch={false}><UiText text="Vodiči za gitaru" /></Link>
            <Link href="/pesme" prefetch={false}><UiText text="Pronađi pesme sa akordima" /></Link>
            <Link href="/akordi" prefetch={false}><UiText text="Dijagrami akorda za gitaru" /></Link>
            <Link href="/plejliste/beginner" prefetch={false}><UiText text="Pesme za početnike" /></Link>
          </nav>
          <h2><GuideText text={{ sr: "Repertoar, PDF pesmarica i muzičke liste", en: "Repertoire, PDF songbooks and music lists" }} /></h2>
          <p><GuideText text={{ sr: "Plejliste za sviranje okupljaju zapise pesama i tvoja podešavanja tonaliteta i capoa. Moja muzika je zaseban prostor za organizovanje YouTube linkova i slušanje kroz ugrađeni plejer. Javne vodiče i kataloge možeš pregledati bez naloga; za čuvanje ličnih lista potrebno je da se prijaviš.", en: "Performance playlists collect song charts and your key and capo settings. My music is a separate space for organising YouTube links and listening through the embedded player. Public guides and catalogs are available without an account; saving personal lists requires sign-in." }} /></p>
          <nav className={guide.links} aria-label="Plejliste i muzika">
            <Link href="/plejliste" prefetch={false}><GuideText text={{ sr: "Plejliste za gitaru", en: "Guitar playlists" }} /></Link>
            <Link href="/vodici/plejliste-za-gitaru-i-pdf-pesmarica" prefetch={false}><GuideText text={{ sr: "Kako napraviti PDF pesmaricu", en: "How to create a PDF songbook" }} /></Link>
            <Link href="/public-listening-playlists" prefetch={false}><GuideText text={{ sr: "Javne muzičke liste", en: "Public music lists" }} /></Link>
            <Link href="/vodici/youtube-muzika-i-muzicke-plejliste" prefetch={false}><GuideText text={{ sr: "Kako napraviti listu za slušanje", en: "How to create a listening list" }} /></Link>
          </nav>
          <h2><GuideText text={{ sr: "Biografije i diskografije izvođača", en: "Artist biographies and discographies" }} /></h2>
          <p><GuideText text={{ sr: "Uz izvođače pronađi dostupne biografije, studijske i koncertne albume, kompilacije i singlove. Sa profila pređi na njihove pesme, a navedene izvore možeš proveriti zasebno.", en: "Explore available artist biographies, studio and live albums, compilations and singles. Follow an artist's profile to their songs and check the credited sources separately." }} /></p>
          <nav className={guide.links} aria-label="Izvođači i izvori">
            <Link href="/biografija" prefetch={false}><GuideText text={{ sr: "Pregledaj biografije i diskografije", en: "Browse biographies and discographies" }} /></Link>
            <Link href="/wiki-izvori" prefetch={false}><GuideText text={{ sr: "Izvori biografija i diskografija", en: "Biography and discography sources" }} /></Link>
          </nav>
        </div>
      </section>

    </div>
  )
}
