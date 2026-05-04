"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function LatestSongs() {

  const [songs, setSongs] = useState<any[]>([])

  useEffect(() => {
  fetch("/api/latest")
    .then(async (res) => {
      if (!res.ok) throw new Error("API error")
      const text = await res.text()
      return text ? JSON.parse(text) : []
    })
    .then(data => setSongs(data))
    .catch(err => {
      console.error("Latest error:", err)
      setSongs([])
    })
}, [])

  return (
    <section className="relative w-full py-10">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/images/hero/hero-openair-stage.jpg"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-2xl font-bold mb-6 text-white">
          Najnovije pesme
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