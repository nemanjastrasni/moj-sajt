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
  <div className="flex gap-10 pb-10 max-w-6xl mx-auto">

    {/* LEFT LIST */}
    <div className="w-1/4 space-y-2">

      {items.map((item: any, index: number) => (
        <div
          key={item.id}
          onClick={() => setActiveIndex(index)}
          className={`flex justify-between text-sm p-2 rounded cursor-pointer 
          ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
        >
          <div className="flex justify-between w-full items-center">

  <span className="truncate">
    🎵 {item.title || "Pesma"}
  </span>

  <form
    action={`/api/listening-playlist/item/${item.id}`}
    method="POST"
  >
    <button className="text-red-500 text-xs ml-2">
      🗑
    </button>
  </form>

</div>

          <span className="text-gray-400">
            {item.type === "youtube" ? "YT" : ""}
          </span>
        </div>
      ))}

    </div>

    {/* CENTER PLAYER */}
    <div className="flex-1">

      {activeIndex !== null && (
        <>
          <div className="mb-2 text-sm">
            Now playing
          </div>

          <iframe
            src={`https://www.youtube.com/embed/${extractYoutubeId(items[activeIndex].url)}?autoplay=1`}
            className="w-full h-64 rounded"
            allow="autoplay"
          />
        </>
      )}

    </div>

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