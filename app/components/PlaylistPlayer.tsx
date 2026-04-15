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
  const prevItem = items[(activeIndex - 1 + items.length) % items.length]
  const nextItem = items[(activeIndex + 1) % items.length]

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

    {/* PREV */}
    <div
      className="absolute opacity-40 transition-all duration-700 ease-in-out"
      style={{ transform: "translateX(-150%) scale(0.8)" }}
    >
      <img
        src={`https://img.youtube.com/vi/${extractYoutubeId(prevItem.url)}/0.jpg`}
        className="w-80 h-48 rounded"
      />
    </div>

    {/* CURRENT */}
    <div className="z-10 transition-all duration-700 ease-in-out">
      <iframe
        key={activeIndex}
        src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
        className="w-96 h-56 rounded shadow-xl"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>

    {/* NEXT */}
    <div
      className="absolute opacity-40 transition-all duration-700 ease-in-out"
      style={{ transform: "translateX(150%) scale(0.8)" }}
    >
      <img
        src={`https://img.youtube.com/vi/${extractYoutubeId(nextItem.url)}/0.jpg`}
        className="w-80 h-48 rounded"
      />
    </div>

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