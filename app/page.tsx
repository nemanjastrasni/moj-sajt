"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import Hero from "./components/Hero"
import PopularSongs from "./components/PopularSongs"
import LatestSongs from "./components/LatestSongs"

export default function HomePage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])

  return (
    <main className="w-full">

      {/* ADMIN LOGIN */}
      <div className="absolute right-6 top-24 z-20">
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-80"
        >
          Login
        </button>
      </div>

      {/* SEARCH */}
      <div className="w-full flex justify-center mt-6 mb-4 z-[9999] relative">
        <div className="relative w-full max-w-md">

          <input
            value={query}
            onChange={async (e) => {
              const value = e.target.value
              setQuery(value)

              if (value.length < 2) {
                setResults([])
                return
              }

              const res = await fetch(`/api/search?q=${value}`)
              const data = await res.json()
              setResults(data)
            }}
            type="text"
            placeholder="Traženje pesama..."
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-400"
          />

          {results.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-neutral-900 text-gray-100 shadow-2xl rounded-xl border border-gray-600 z-[99999]">
              {results.map((song: any) => (
                <a
                  key={song.id}
                  href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
                  className="block px-4 py-2 hover:bg-white/10 transition"
                >
                  {song.artist.name} – {song.title}
                </a>
              ))}
            </div>
          )}

        </div>
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
              src="/hero/narodne.jpg"
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
              src="/hero/domace.jpg"
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Domaće
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/strane"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="/hero/strane.jpg"
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