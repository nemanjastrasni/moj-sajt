"use client"

import { useEffect, useState, useRef } from "react"

export default function PlaylistPlayer({ playlist }: any) {
  const items = playlist.items

  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [meta, setMeta] = useState<any>({})
  const touchStartX = useRef<number | null>(null)

  // 🔥 FETCH TITLE
  useEffect(() => {
    items.forEach(async (item: any) => {
      if (item.type !== "youtube") return

      const id = extractYoutubeId(item.url)

      try {
        const res = await fetch(`/api/youtube?id=${id}`)
        const data = await res.json()

        setMeta((prev: any) => ({
          ...prev,
          [item.id]: { title: data.title },
        }))
      } catch {}
    })
  }, [items])

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }

  const prev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1
    )
  }

  // 🔥 SWIPE
  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return

    const diff = e.changedTouches[0].clientX - touchStartX.current

    if (diff > 50) prev()
    if (diff < -50) next()

    touchStartX.current = null
  }

  const activeItem = items[activeIndex]
  const activeId = extractYoutubeId(activeItem.url)

  return (
    <div className="relative flex gap-10 pb-10 w-full">

      {/* 🔥 BLUR BACKGROUND */}
      <div
        className="absolute inset-0 -z-10 opacity-30 blur-2xl"
        style={{
          backgroundImage: `url(https://img.youtube.com/vi/${activeId}/0.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* LEFT LIST */}
      <div className="w-80 space-y-2">

        {items.map((item: any, index: number) => (
          <div
            key={item.id}
            onClick={() => setActiveIndex(index)}
            className={`p-2 rounded cursor-pointer text-sm 
            ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            🎵 {meta[item.id]?.title || "Loading..."}
          </div>
        ))}

      </div>

      {/* CENTER CAROUSEL */}
      <div
        className="flex-1 flex flex-col items-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        <div className="relative w-full h-80 flex items-center justify-center overflow-hidden">

          {items.map((item: any, index: number) => {
            const position = index - activeIndex

            return (
              <div
                key={item.id}
                className={`absolute transition-all duration-500 ${
                  position === 0
                    ? "scale-100 opacity-100 z-10"
                    : position === -1
                    ? "scale-75 opacity-40 -translate-x-40"
                    : position === 1
                    ? "scale-75 opacity-40 translate-x-40"
                    : "scale-50 opacity-0"
                }`}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(
                    item.url
                  )}`}
                  className="w-96 h-56 rounded shadow-xl"
                  allow="autoplay; fullscreen"
                />
              </div>
            )
          })}

        </div>

        {/* CONTROLS */}
        <div className="flex gap-4 mt-4">

          <button onClick={prev} className="px-3 py-1 bg-white/10 rounded">
            ⬅
          </button>

          <button onClick={next} className="px-3 py-1 bg-white/10 rounded">
            ➡
          </button>

        </div>

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