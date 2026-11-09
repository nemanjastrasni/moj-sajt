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

const homeTitle = `${SITE_NAME} – Akordi za gitaru i tekstovi pesama`
const homeMetadata = publicPageMetadata(homeTitle, "Akordi za gitaru i tekstovi zabavnih, narodnih i stranih pesama. Pronađi pesmu, promeni tonalitet i sačuvaj svoj repertoar u plejlisti.", "/")

export const metadata = { ...homeMetadata, title: { absolute: homeTitle } }
export const revalidate=60

export default async function HomePage() {
  const [popular,latest]=await Promise.all([getHomeSongs("popular").catch(()=>undefined),getHomeSongs("latest").catch(()=>undefined)])

  return (
    <div className="w-full home-page">
      <StructuredData data={websiteData()} />
      <h1 className="sr-only">{SITE_NAME} – <UiText text="Akordi za gitaru i tekstovi pesama" /></h1>

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
          <h2 id="home-song-guide"><UiText text="Pesme sa akordima za gitaru" /></h2>
          <p><UiText text="Pronađi pesmu po naslovu ili izvođaču, izaberi kategoriju i otvori zapis za sviranje. Uz pesme su dostupni promena tonaliteta, lične plejliste i izvoz PDF pesmarice." /></p>
          <p><UiText text="Za početak izaberi lakše pesme ili pogledaj dijagrame akorda pre nego što sastaviš svoj repertoar." /></p>
          <nav className={guide.links} aria-labelledby="home-song-guide">
            <Link href="/pesme" prefetch={false}><UiText text="Pronađi pesme sa akordima" /></Link>
            <Link href="/akordi" prefetch={false}><UiText text="Dijagrami akorda za gitaru" /></Link>
            <Link href="/plejliste/beginner" prefetch={false}><UiText text="Pesme za početnike" /></Link>
          </nav>
        </div>
      </section>

    </div>
  )
}
