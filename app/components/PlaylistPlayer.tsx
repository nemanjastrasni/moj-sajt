"use client"

import { useEffect, useState } from "react"

export default function PlaylistPlayer({ playlist }: any) {
  const items = playlist.items
  const [mode, setMode] = useState<"next" | "shuffle">("next")
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [meta, setMeta] = useState<any>({})
  const [isShuffle, setIsShuffle] = useState(false)

  const playNext = () => {
  if (activeIndex === null) return

  if (isShuffle) {
    const rand = Math.floor(Math.random() * items.length)
    setActiveIndex(rand)
  } else {
    const next = (activeIndex + 1) % items.length
    setActiveIndex(next)
  }
}
  
  const shuffle = () => {
    const rand = Math.floor(Math.random() * items.length)
    setActiveIndex(rand)
  }

  // 🔥 FETCH TITLE + DURATION
  useEffect(() => {
    items.forEach(async (item: any) => {
      if (item.type !== "youtube") return

      const id = extractYoutubeId(item.url)
      if (!id) return

      try {
        const res = await fetch(`/api/youtube?id=${id}`)
        const data = await res.json()

        setMeta((prev: any) => ({
          ...prev,
          [item.id]: {
            title: data.title,
            duration: parseDuration(data.duration),
          },
        }))
      } catch (err) {
        console.log("YT fetch error", err)
      }
    })
  }, [items])

  // 🔥 AUTOPLAY NEXT (timer-based)
  useEffect(() => {
  if (activeIndex === null) return

  const item = items[activeIndex]
  const duration = meta[item.id]?.duration

  // 🔥 fallback ako nema duration
  const time = duration ? duration - 1 : 180 // 3 min default

  const safeDuration = Math.max(time, 1)

  const timer = setTimeout(() => {
    playNext()
  }, safeDuration * 1000)

  return () => clearTimeout(timer)
}, [activeIndex, meta])


  return (
    <div className="flex gap-10 pb-10 w-full">

      {/* LEFT LIST */}
      <div className="w-80 space-y-2">

        {items.map((item: any, index: number) => (
          <div
            key={item.id}
            onClick={() => setActiveIndex(index)}
            className={`flex justify-between text-sm p-2 rounded cursor-pointer 
            ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            <div className="flex items-center justify-between w-full">

              {/* TITLE */}
              <span className="truncate">
                🎵 {meta[item.id]?.title || "Loading..."}
              </span>

              {/* DURATION */}
              <span className="text-gray-400 text-xs ml-2">
                {meta[item.id]?.duration
                  ? `${Math.floor(meta[item.id].duration / 60)}:${String(
                      meta[item.id].duration % 60
                    ).padStart(2, "0")}`
                  : ""}
              </span>

              {/* DELETE */}
              <form
                action={`/api/listening-playlist/item/${item.id}`}
                method="POST"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="text-red-500 text-xs ml-2">
                  🗑
                </button>
              </form>
            </div>

            <span className="text-gray-400 ml-2">
              YT
            </span>
          </div>
        ))}

      </div>
     <div className="text-xs text-gray-400">
  {isShuffle ? "Shuffle ON" : "Playlist order"}
</div>
      {/* CENTER PLAYER */}
      <div className="flex-1">

        {activeIndex !== null && (
          <>
            <div className="mb-2 text-sm">
              Now playing
            </div>

            <div className="flex gap-3 mb-2">
              <button
  onClick={() => setMode("next")}
  className={`px-2 py-1 rounded ${
    mode === "next" ? "bg-green-500 text-black" : "bg-white/10"
  }`}
>
  ⏭
</button>

<button
  onClick={() => setMode("shuffle")}
  className={`px-2 py-1 rounded ${
    mode === "shuffle" ? "bg-green-500 text-black" : "bg-white/10"
  }`}
>
  🔀
</button>
<div className="text-xs text-gray-400">
  Mode: {mode === "shuffle" ? "Shuffle" : "Playlist"}
</div>
            </div>

            {/* 🔥 KLJUČNI FIX */}
            <iframe
  key={activeIndex}
  src={`https://www.youtube.com/embed/${extractYoutubeId(
    items[activeIndex].url
  )}?autoplay=1&mute=0&controls=1`}
  className="w-full h-64 rounded"
  allow="autoplay; fullscreen"
  allowFullScreen
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

function parseDuration(duration: string) {
  const match = duration.match(/PT(\d+M)?(\d+S)?/)
  const minutes = match?.[1] ? parseInt(match[1]) : 0
  const seconds = match?.[2] ? parseInt(match[2]) : 0

  return minutes * 60 + seconds
}