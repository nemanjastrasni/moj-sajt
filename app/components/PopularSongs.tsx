"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function PopularSongs() {

  const [songs, setSongs] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/popular")
      .then(res => res.json())
      .then(data => setSongs(data))
  }, [])

  return (
    <section className="relative w-full py-10">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/images/hero/hero-festival-purple.jpg"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-2xl font-bold mb-6 text-white">
          Popularne pesme
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {songs.map((song) => (
            <Link
              key={song.id}
              href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
              className="block px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition"
            >
              <div className="text-white text-sm font-medium">
                {song.title}
              </div>
              <div className="text-gray-400 text-xs">
                {song.artist.name}
              </div>
            </Link>
          ))}

        </div>

      </div>
    </section>
  )
}