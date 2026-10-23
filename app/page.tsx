import Link from "next/link"
import Hero from "./components/Hero"
import PopularSongs from "./components/PopularSongs"
import LatestSongs from "./components/LatestSongs"

import SongSearch from "./components/SongSearch"

export default function HomePage() {

  return (
    <main className="w-full">

      {/* SEARCH */}
      <div className="relative z-20 mt-6 mb-4 flex w-full justify-center">
        <SongSearch />
      </div>

      {/* HERO (NOVI) */}
      <Hero />

      {/* KATEGORIJE */}
      <section className="max-w-6xl mx-auto px-6 py-14">

        <h2 className="text-2xl font-bold mb-8 text-white">
          Pesme
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          <Link
            href="/pesme/narodne"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="/images/narodne.jpg"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Narodne
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/domace"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="/images/domace.jpg"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Zabavne
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/strane"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="/images/strane.jpg"
              alt=""
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Strane
              </span>
            </div>
          </Link>

        </div>

      </section>
      <PopularSongs />
      <LatestSongs />

    </main>
  )
}
