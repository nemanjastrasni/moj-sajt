"use client"

import { useState } from "react"

export default function PlaylistPlayer({ playlist }: any) {
  const items = playlist.items

  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const playNext = () => {
    if (activeIndex === null) return
    const next = (activeIndex + 1) % items.length
    setActiveIndex(next)
  }

  const shuffle = () => {
    const rand = Math.floor(Math.random() * items.length)
    setActiveIndex(rand)
  }

  return (
    <div className="pb-24">

      {/* ITEMS */}
      <div className="grid gap-4">

        {items.length === 0 && (
          <p className="text-gray-400">Nema pesama još</p>
        )}

        {items.map((item: any, index: number) => (
          <div key={item.id} className="border-b border-gray-800 pb-3">

            <div
              onClick={() => setActiveIndex(index)}
              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"
            >

              {item.type === "youtube" && (
                <img
                  src={`https://img.youtube.com/vi/${extractYoutubeId(item.url)}/0.jpg`}
                  className="w-16 h-16 object-cover rounded"
                />
              )}

              {item.type === "spotify" && (
                <div className="w-16 h-16 bg-green-500 flex items-center justify-center rounded text-black font-bold">
                  SP
                </div>
              )}

              <div className="flex-1 text-sm">
                {item.title || item.url}
              </div>

              <div className="text-xs text-gray-400">
                {item.type === "youtube" ? "YT" : "SP"}
              </div>
            </div>

          </div>
        ))}

      </div>

      {/* PLAYER */}
      {activeIndex !== null && (
        <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-800 p-3">

          <div className="flex items-center gap-3">

            <button onClick={playNext}>⏭</button>
            <button onClick={shuffle}>🔀</button>

            <div className="flex-1">
              {items[activeIndex].type === "youtube" && (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(items[activeIndex].url)}?autoplay=1`}
                  className="w-full h-20"
                  allow="autoplay"
                />
              )}

              {items[activeIndex].type === "spotify" && (
                <iframe
                  src={`https://open.spotify.com/embed/track/${extractSpotifyId(items[activeIndex].url)}`}
                  className="w-full h-20"
                />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// helpers
function extractYoutubeId(url: string) {
  const match =
    url.match(/v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/)
  return match?.[1] || ""
}

function extractSpotifyId(url: string) {
  const match = url.match(/track\/([a-zA-Z0-9]+)/)
  return match?.[1] || ""
}