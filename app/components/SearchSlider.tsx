"use client"

import { useState } from "react"

export default function SearchSlider() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])

  return (
    <div className="relative flex items-center">
      <div
        onClick={() => !open && setOpen(true)}
        className={`bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 rounded-full transition-all duration-300 cursor-pointer
        ${open ? "w-64 h-10" : "w-3 h-20"}
        flex items-center justify-center`}
      >
        {open && (
          <div className="relative w-full">
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
              placeholder=""
              className="bg-transparent outline-none w-full px-3 text-black"
            />

            {results.length > 0 && (
              <div className="absolute top-10 left-0 w-full bg-white text-black shadow-lg rounded z-50">
                {results.map((song) => (
                  <a
                    key={song.id}
                    href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
                    className="block px-3 py-2 hover:bg-gray-200"
                  >
                    {song.artist.name} – {song.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}