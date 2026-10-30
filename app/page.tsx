import Link from "next/link"
import Hero from "./components/Hero"
import PopularSongs from "./components/PopularSongs"
import LatestSongs from "./components/LatestSongs"

import UiText from "./components/UiText"
import HomeRepertoire from "./components/HomeRepertoire"
import SiteImage from "./components/SiteImage"
import { publicPageMetadata } from "@/lib/seo/metadata"

export const metadata = publicPageMetadata("GitaraAkordi – Akordi i tekstovi pesama", "Pesme sa akordima, lične plejliste, capo, PDF pesmarice, biografije i diskografije izvođača.", "/")

export default function HomePage() {

  return (
    <div className="w-full">
      <h1 className="sr-only">GitaraAkordi – <UiText text="Akordi i tekstovi" /></h1>

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
      <PopularSongs />
      <LatestSongs />

    </div>
  )
}
